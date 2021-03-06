'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const {timeMark, timeDuration} = require('../ServiceStat');
const got = require('got');
const qs = require('querystring');
const fetch = require('node-fetch');
const lazy = require('lazy.js');

const CHBufferWriter = require('./CHBufferWriter');

/**
 * Base ClickHouse lib.
 * Used for raw data queries and modifications
 * Also provide object-push style writing
 * @property {ServiceStat} stat Internal stat service
 */
class CHClient {

  /**
   * @param options
   * @param log
   * @param services
   */
  constructor(options, {log, ...services}) {

    this.log = log.child({name: this.constructor.name});
    this.log.info({url: this.url}, 'Starting ClickHouse client');

    // Binding services
    Object.assign(this, services);

    this.options = Object.assign({
      uploadInterval: 5000,
      httpTimeout: 5000,
      enabled: false
    }, options);

    const {protocol, hostname, port, db, auth} = this.options;

    this.queryParams = {
      database: db
    };
    if (auth) {
      const [user, password] = auth.split(':');
      this.queryParams = {user, password, ...this.queryParams};
    }


    this.db = db;
    this.url = `${protocol}//${hostname}:${port}`;

    this.writers = new Map();

    /**
     * Returns writer for table
     * @param table
     * @return {CHBufferWriter}
     */
    this.getWriter = (table) => {
      if (!this.writers.has(table)) {
        this.writers.set(table, new CHBufferWriter({table}, {log, ...services}));
      }
      return this.writers.get(table);
    };
  }

  init() {

    setInterval(
      () => this.flushWriters(),
      this.options.uploadInterval);

    this.log.info('Started');
  }


  /**
   * Execution data modification query
   * @param query
   */
  async execute(query) {

    const queryUrl = this.url + '/?' + qs.stringify(this.queryParams);
    let responseBody;

    try {

      const res = await fetch(queryUrl, {
        method: 'POST',
        body: query
      });
      responseBody = await res.text();

      if (res.ok) {
        this.stat.mark('clickhouse.query.success');
        return responseBody;
      }

    } catch (error) {
      this.stat.mark('clickhouse.error.upload');
      throw error;
    }

    this.stat.mark('clickhouse.error.upload');
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);


  }

  /**
   * Executes query and return resul
   * @param query <string> SQL query
   * @return Promise<Buffer>
   */
  async query(query) {

    const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.queryParams, {query}));
    let responseBody;

    try {

      const startAt = timeMark();

      const res = await fetch(queryUrl);
      responseBody = await res.text();

      if (res.ok) {
        this.stat.histPush(`clickhouse.query.success`, timeDuration(startAt));
        return responseBody;
      }

    } catch (error) {
      this.stat.mark('clickhouse.error.upload');
      throw error;
    }

    this.stat.mark('clickhouse.error.upload');
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);

  }

  /**
   * Executes query and return stream
   * @param query <string> SQL query
   * @return Stream
   */
  querySream(query) {

    throw new Error('Not implemented');
  }

  /**
   * Returns DB structure
   * @return Promise<Buffer>
   */
  tablesColumns() {
    return this.query(`SELECT table, name, type FROM system.columns WHERE database = '${this.db}' FORMAT JSON`)
      .then(result => JSON.parse(result.toString()))
      .then(parsed => parsed.data);
  }


  /**
   * Flushing writers
   */
  flushWriters() {

    const tables = [...this.writers.keys()].sort();
    const delay = Math.round(this.options.uploadInterval / tables.length);
    let i = 0;

    for (const table of tables) {

      setTimeout(() => {
        const writer = this.writers.get(table);
        this.writers.delete(table);
        this.log.debug(`uploding ${table}`);

        writer.close()
          .then(({table, filename, buffer}) => {
            this.handleBuffer({
              table,
              filename,
              buffer
            });
          })
          .catch(error => {
            this.log.error(error, 'File close error');
          });
      }, delay * i++);
    }
  }

  /**
   * Uploading each-line-json to ClickHouse
   */
  handleBuffer({table, filename, buffer}) {

    // Skip if no data
    if (!buffer.byteLength) {
      return this.unlinkFile(filename);
    }

    const queryUrl = this.url + '/?' + qs.stringify(
      Object.assign(
        {},
        this.queryParams,
        {query: `INSERT INTO ${table} FORMAT JSONEachRow`}
      )
    );
    this.stat.mark(`clickhouse.upload.try`);

    const startAt = timeMark();

    (async () => {

      try {

        const res = await fetch(queryUrl, {
          method: 'POST',
          body: buffer
        });
        const body = await res.text();

        if (res.ok) {
          this.stat.histPush(`clickhouse.upload.success`, timeDuration(startAt));
          return this.unlinkFile(filename)
            .then(null);
        }

        this.log.error({
          body: body,
          code: res.status
        }, 'Wrong code');

      } catch (error) {

        this.log.error(error, 'Error uploading to CH');
      }

      this.stat.histPush(`clickhouse.error.upload`, timeDuration(startAt));

    })();
  }

  /**
   * Remove uploaded file
   * @param filename
   */
  unlinkFile(filename) {
    return fs.unlinkAsync(filename)
      .then(() => {
        this.log.debug('file unlinked');
      });
  }

}

module.exports = CHClient;
