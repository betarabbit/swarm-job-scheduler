const Docker = require('dockerode');
const StatsD = require('hot-shots');

const { statsd } = require('../config');
const logger = require('./logger');

const docker = new Docker();

const client = new StatsD({
  errorHandler: error => logger.error('Something went wrong!', { error }),
  mock: process.env.NODE_ENV !== 'production',
  ...statsd
});

module.exports = async function process(job) {
  const { name, image, registry, cmd, networkName } = job.data;

  const net = await docker
    .listNetworks({ filters: { name: [networkName] } })
    .then(nets => (nets.length === 1 ? nets[0] : null));

  try {
    logger.info(
      `Pulling image [${image}] from registry [${registry ? registry.serveraddress : 'Dockerhub'}].`
    );

    await docker.pull(image, { authconfig: registry });

    logger.info(
      `Image [${image}] pulled from registry [${registry ? registry.serveraddress : 'Dockerhub'}].`
    );

    logger.info(`Container [${name}] started.`, { image, cmd, net });

    const options = net
      ? {
          HostConfig: { AutoRemove: true },
          NetworkingConfig: { EndpointsConfig: { net: { NetworkID: net.Id } } }
        }
      : { HostConfig: { AutoRemove: true } };

    const container = await docker.run(image, cmd, process.stdout, options);
    const status = container.output.StatusCode;

    client.gauge(`${name}.status`, status);

    if (status === 0) {
      logger.info(`Container [${name}] finished and removed.`, {
        image,
        cmd,
        net,
        ...container.output
      });
    } else {
      logger.info(`Container [${name}] failed and removed.`, {
        image,
        cmd,
        net,
        ...container.output
      });
    }
  } catch (error) {
    logger.error(`Exception occurred during container execution.`, { image, cmd, net, error });
  }
};
