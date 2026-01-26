import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { ExportNames } from '../../../third-party/common/ts/cdk/export-names';
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

const getCfnValue = (key: keyof Config, prefix: string, exportSuffix: ExportNames): string => {
    return configFile[key] || cdk.Fn.importValue(prefix + exportSuffix);
}

const getSsmValue = (stack: cdk.Stack, prefix: string, parameterSuffix: keyof Config): string => {
    return configFile[parameterSuffix] || ssm.StringParameter.valueForStringParameter(stack, prefix + parameterSuffix);
}

export const getConfig = (stack: cdk.Stack, cfnPrefix: string, ssmPrefix: string): Config => ({
    alertEmail: getCfnValue('alertEmail', cfnPrefix, ExportNames.AlertEmail),

    telegramToken: getSsmValue(stack, ssmPrefix, 'telegramToken'),
    telegramSourceChannelId: getSsmValue(stack, ssmPrefix, 'telegramSourceChannelId'),
    telegramTargetGroupId: getSsmValue(stack, ssmPrefix, 'telegramTargetGroupId'),

    updatePublishingDetailsFunctionName: getCfnValue('updatePublishingDetailsFunctionName', cfnPrefix, ExportNames.UpdatePublishingDetailsFunctionName),
    videoDownloadedTopicArn: getCfnValue('videoDownloadedTopicArn', cfnPrefix, ExportNames.VideoDownloadedSnsTopicArn),
    sceneRecognisedTopicArn: getCfnValue('sceneRecognisedTopicArn', cfnPrefix, ExportNames.SceneRecognisedSnsTopicArn),

    retriesMax: getSsmValue(stack, ssmPrefix, 'retriesMax'),
    retriesDelayMs: getSsmValue(stack, ssmPrefix, 'retriesDelayMs'),
});