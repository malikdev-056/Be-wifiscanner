const { execFile } = require('node:child_process');
const os = require('node:os');
const xml2js = require('xml2js');

function ipToNumber(ip) {
  return ip.split('.').reduce((value, part) => (value * 256) + Number(part), 0) >>> 0;
}

function numberToIp(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

function getSubnet() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const network of entries || []) {
      if (network.family === 'IPv4' && !network.internal && network.netmask) {
        const address = ipToNumber(network.address);
        const mask = ipToNumber(network.netmask);
        const networkAddress = numberToIp(address & mask);
        const prefix = mask.toString(2).split('1').length - 1;
        return `${networkAddress}/${prefix}`;
      }
    }
  }

  throw new Error('No active local IPv4 network interface was found');
}

function getAddress(host, type) {
  const address = (host.address || []).find((entry) => entry.$?.addrtype === type);
  return address?.$?.addr || null;
}

function getHostname(host) {
  return host.hostnames?.[0]?.hostname?.[0]?.$?.name || null;
}

async function scanNetwork() {
  const subnet = getSubnet();
  const xml = await new Promise((resolve, reject) => {
    execFile(
      'nmap',
      ['-sn', '-PR', '-oX', '-', subnet],
      { timeout: 30000, maxBuffer: 1024 * 1024 * 5 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(stdout);
      }
    );
  });

  const parsed = await xml2js.parseStringPromise(xml);
  const hosts = parsed.nmaprun?.host || [];

  return hosts
    .filter((host) => host.status?.[0]?.$?.state === 'up')
    .map((host) => ({
      ip: getAddress(host, 'ipv4'),
      mac: getAddress(host, 'mac'),
      hostname: getHostname(host),
      vendor: host.address?.find((entry) => entry.$?.addrtype === 'mac')?.$?.vendor || null
    }))
    .filter((device) => device.ip);
}

module.exports = { scanNetwork };
