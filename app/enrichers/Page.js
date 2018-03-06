'use strict';

const pick = require('es6-pick');
const Joi = require('joi');
const url = require('url');

const Schema = Joi.object().keys({

  domain: Joi.string().required(),
  query: Joi.object().keys({
    utm_source: Joi.string().optional(),
    utm_campaign: Joi.string().optional(),
    utm_medium: Joi.string().optional(),
    utm_content: Joi.string().optional(),
    utm_term: Joi.string().optional(),
  }).unknown(true).pattern(/.*/, Joi.string()).default({}),
  proto: Joi.string().allow(['http', 'https', 'other']).required()

});

const validProtos = new Set(['http', 'https']);
const otherProto = 'other';

const handle = (data) => {

  const parsedURL = url.parse(data.url, true);
  const proto = parsedURL.protocol.slice(0,-1);

  return {
    domain: parsedURL.hostname,
    proto: validProtos.has(proto) >= 0 ? proto : otherProto,
    query: parsedURL.query
  };
};


class PageEnricher {

  constructor(options, {log}) {

    this.log = log.child({module: 'Page'});
    this.prefix = 'page';

  }

  async get(msg) {

    const query = msg && msg.page && msg.page.url;
    const response = {};

    if (!query) {
      return response;
    }

    try {

      const data = msg.page;

      return await Joi.validate(
        handle(data),
        Schema
      );

    } catch (error) {
      this.log.error(error);
    }

    return response;

  }
}

PageEnricher.Schema = Schema;
PageEnricher.handle = handle;

module.exports = PageEnricher;