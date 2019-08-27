const path = require('path');
const Queue = require('bull');
const Docker = require('dockerode');

const logger = require('./logger');
const config = require('../config');

const JOB_STATUS = ['completed', 'wait', 'active', 'paused', 'delayed', 'failed'];
const queues = [];

async function cleanJobs(queue) {
  try {
    // clear all wait and delayed jobs
    logger.info(`Cleaning existing jobs in queue [${queue.name}].`);

    const cleanedExistingJobs = await Promise.all(JOB_STATUS.map(s => queue.clean(0, s)));

    logger.info(
      `${cleanedExistingJobs.reduce(
        (prev, curr) => prev + curr.length,
        0
      )} Existing jobs in queue cleaned in queue [${queue.name}]..`
    );

    const repeatableJobs = await queue.getRepeatableJobs();

    logger.info(`Cleaning ${repeatableJobs.length} repeatable jobs in queue [${queue.name}]..`);

    const cleanedRepeatableJobs = await Promise.all(
      repeatableJobs.map(j => queue.removeRepeatable(j.name, j))
    );

    logger.info(
      `${cleanedRepeatableJobs.length} repeatable jobs cleaned in queue [${queue.name}]..`
    );
  } catch (err) {
    logger.error('Fail to clean jobs.', { err });
  }
}

async function main() {
  const docker = new Docker();
  const isManager = await docker.info().then(info => info.Swarm.ControlAvailable);

  logger.info(`Current node is Manager node: ${isManager}`);

  config.jobs.forEach(async job => {
    const { name, image, cmd, registry, networkName, location, repeat } = job;
    const queueName = location ? `${location}_${name}` : name;

    try {
      if (
        (isManager && location === 'manager') ||
        (!isManager && location === 'worker') ||
        !location
      ) {
        const queue = new Queue(queueName, config.redis);

        await cleanJobs(queue);

        logger.info(`Adding job [${name}] into queue [${queueName}].`, { job });

        await queue.add(
          { name, image, cmd, registry, networkName },
          { repeat, removeOnComplete: true, removeOnFail: true }
        );
        queue.process(path.join(__dirname, 'processor.js'));
        queues.push(queue);

        logger.info(`Job [${name}] added.`, { job });
      }
    } catch (error) {
      logger.error(`Fail to add job [${name}] into queue [${queueName}].`, { error });
      process.exit(1);
    }
  });
}

process.on('exit', async () => {
  await Promise.all(queues.map(q => cleanJobs(q)));
});

main();
