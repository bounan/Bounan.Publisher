import type * as cdk from 'aws-cdk-lib';

import { ExportNames } from '../../../third-party/common/ts/cdk/export-names';
import { getCfnValue, getSsmValue } from '../../../third-party/common/ts/cdk/helpers';
import configFile from './configuration.json';

export interface Config {
  alertEmail: string;
  telegramToken: string;
  telegramSourceChannelId: string;
  telegramTargetGroupId: string;
  updatePublishingDetailsFunctionName: string;
  videoDownloadedTopicArn: string;
  sceneRecognisedTopicArn: string;
  retriesMax: string;
  retriesDelayMs: string;
}

export const getConfig = (stack: cdk.Stack, cfnPrefix: string, ssmPrefix: string): Config => ({
  alertEmail: getCfnValue('alertEmail', cfnPrefix, ExportNames.AlertEmail, configFile),

  telegramToken: getSsmValue(stack, ssmPrefix, 'telegramToken', configFile),
  telegramSourceChannelId: getSsmValue(stack, ssmPrefix, 'telegramSourceChannelId', configFile),
  telegramTargetGroupId: getSsmValue(stack, ssmPrefix, 'telegramTargetGroupId', configFile),

  updatePublishingDetailsFunctionName: getCfnValue('updatePublishingDetailsFunctionName', cfnPrefix, ExportNames.UpdatePublishingDetailsFunctionName, configFile),
  videoDownloadedTopicArn: getCfnValue('videoDownloadedTopicArn', cfnPrefix, ExportNames.VideoDownloadedSnsTopicArn, configFile),
  sceneRecognisedTopicArn: getCfnValue('sceneRecognisedTopicArn', cfnPrefix, ExportNames.SceneRecognisedSnsTopicArn, configFile),

  retriesMax: getSsmValue(stack, ssmPrefix, 'retriesMax', configFile),
  retriesDelayMs: getSsmValue(stack, ssmPrefix, 'retriesDelayMs', configFile),
});