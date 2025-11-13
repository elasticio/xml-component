/* eslint-disable class-methods-use-this */
import axios, { AxiosRequestConfig } from 'axios';
import { URL } from 'url';
import { ObjectStorage } from '@elastic.io/maester-client';
import { RetryOptions, ResponseType, CONTENT_TYPE_HEADER, REQUEST_TIMEOUT, RETRIES_COUNT } from '@elastic.io/maester-client/dist/src/interfaces';
import { Readable } from 'stream';
import { getLogger } from '../logger/logger';
import packageJson from '../../package.json';

const logger = getLogger();
const maesterClientVersion = packageJson.dependencies['@elastic.io/maester-client'];
const axiosVersion = packageJson.dependencies.axios;

export const STORAGE_TYPE_PARAMETER = 'storage_type';
export const DEFAULT_STORAGE_TYPE = 'steward';
export const MAESTER_OBJECT_ID_ENDPOINT = '/objects/';
const { ELASTICIO_OBJECT_STORAGE_TOKEN = '', ELASTICIO_OBJECT_STORAGE_URI = '' } = process.env;
const maesterCreds = { jwtSecret: ELASTICIO_OBJECT_STORAGE_TOKEN, uri: ELASTICIO_OBJECT_STORAGE_URI };
const DEFAULT_ATTACHMENT_REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT, 10) : REQUEST_TIMEOUT.maxValue; // 20s

export class AttachmentProcessor {
  private userAgent: string;

  private msgId: string;

  public constructor(userAgent?: string, msgId?: string) {
    this.userAgent = userAgent;
    this.msgId = msgId;
  }

  async getAttachment(url: string, responseType: string, retryOptions: RetryOptions = {}) {
    const storageType = this.getStorageTypeByUrl(url);
    const axConfig = {
      url,
      responseType,
      method: 'get',
      timeout: retryOptions.requestTimeout || DEFAULT_ATTACHMENT_REQUEST_TIMEOUT,
      retry: retryOptions.retriesCount || RETRIES_COUNT.defaultValue,
    } as AxiosRequestConfig;

    switch (storageType) {
      case 'steward': return this.getStewardAttachment(axConfig);
      case 'maester': return this.getMaesterAttachment(axConfig as any);
      default: throw new Error(`Storage type "${storageType}" is not supported`);
    }
  }

  async uploadAttachment(getAttachment: () => Promise<Readable>, retryOptions: RetryOptions = {}, contentType?: string) {
    logger.debug('uploading attachment..');
    const headers = {};
    if (contentType) headers[CONTENT_TYPE_HEADER] = contentType;
    const objectStorage = new ObjectStorage({ ...maesterCreds, userAgent: this.userAgent });
    return objectStorage.add(getAttachment, {
      headers,
      retryOptions: {
        requestTimeout: retryOptions.requestTimeout || DEFAULT_ATTACHMENT_REQUEST_TIMEOUT,
        retriesCount: retryOptions.retriesCount || RETRIES_COUNT.defaultValue,
      },
    });
  }

  getMaesterAttachmentUrlById(attachmentId): string {
    return `${maesterCreds.uri}${MAESTER_OBJECT_ID_ENDPOINT}${attachmentId}?${STORAGE_TYPE_PARAMETER}=maester`;
  }

  private async getStewardAttachment(axConfig) {
    const ax = axios.create();
    this.addRetryCountInterceptorToAxios(ax);
    const userAgent = `${this.userAgent} axios/${axiosVersion}`;
    return ax({
      ...axConfig,
      headers: {
        'User-Agent': userAgent,
        'x-request-id': `f:${process.env.ELASTICIO_FLOW_ID};s:${process.env.ELASTICIO_STEP_ID};m:${this.msgId}`,
      }
    });
  }

  private async getMaesterAttachment({ url, responseType }: { url: string, responseType: ResponseType }) {
    const userAgent = `${this.userAgent} maester-client/${maesterClientVersion}`;
    const objectStorage = new ObjectStorage({ ...maesterCreds, userAgent, msgId: this.msgId });
    const maesterAttachmentId = this.getMaesterAttachmentIdByUrl(url);
    return objectStorage.getOne(maesterAttachmentId, { responseType });
  }

  private getStorageTypeByUrl(urlString) {
    const url = new URL(urlString);
    const storageType = url.searchParams.get(STORAGE_TYPE_PARAMETER);
    return storageType || DEFAULT_STORAGE_TYPE;
  }

  private getMaesterAttachmentIdByUrl(urlString): string {
    const { pathname } = new URL(urlString);
    const maesterAttachmentId = pathname.split(MAESTER_OBJECT_ID_ENDPOINT)[1];
    if (!maesterAttachmentId) {
      throw new Error('Invalid Maester Endpoint');
    }
    return maesterAttachmentId;
  }

  private addRetryCountInterceptorToAxios(ax) {
    ax.interceptors.response.use(undefined, (err) => { //  Retry count interceptor for axios
      const { config } = err;
      if (!config || !config.retry || !config.delay) {
        return Promise.reject(err);
      }
      config.currentRetryCount = config.currentRetryCount || 0;
      if (config.currentRetryCount >= config.retry) {
        return Promise.reject(err);
      }
      config.currentRetryCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve(ax(config)), config.delay));
    });
  }
}