const OpenAI = require('openai');

const defaultModel = 'gpt-4o-mini';

function getClient() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
    const error = new Error('OPENAI_API_KEY is not configured in the backend .env file');
    error.publicMessage = error.message;
    error.statusCode = 500;
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizeDevices(devices) {
  return devices.map((device) => ({
    ip: device.ip || 'Unknown',
    mac: device.mac || 'Unknown',
    hostname: device.hostname || 'Unknown',
    vendor: device.vendor || 'Unknown'
  }));
}

function createApiError(error) {
  const apiError = new Error('OpenAI request failed');
  apiError.statusCode = error.status || 502;

  if (error.status === 401) {
    apiError.publicMessage = 'OpenAI authentication failed. Check the backend API key.';
  } else if (error.status === 429) {
    apiError.publicMessage = 'OpenAI rate limit or quota reached. Please try again later.';
  } else {
    apiError.publicMessage = 'OpenAI could not answer right now. Please try again later.';
  }

  return apiError;
}

async function answerNetworkQuestion(message, devices) {
  const normalizedDevices = normalizeDevices(devices);
  const client = getClient();
  const model = process.env.OPENAI_MODEL || defaultModel;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: [
            'Answer questions only about devices visible in the supplied Nmap scan.',
            'Use only the supplied JSON data. Never invent devices, IP addresses, MAC addresses, hostnames, vendors, or counts.',
            'Unknown means the value was not returned by Nmap.',
            'If the answer is not supported by the data, say so clearly.',
            'Use concise plain text and describe the results as visible to Nmap, not as every device attached to the router.'
          ].join(' ')
        },
        {
          role: 'user',
          content: `Question: ${message}\n\nNmap scan data:\n${JSON.stringify(normalizedDevices)}`
        }
      ]
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (!answer) {
      const error = new Error('OpenAI returned an empty answer');
      error.publicMessage = error.message;
      error.statusCode = 502;
      throw error;
    }

    return answer;
  } catch (error) {
    if (error.publicMessage) throw error;
    throw createApiError(error);
  }
}

module.exports = { answerNetworkQuestion };