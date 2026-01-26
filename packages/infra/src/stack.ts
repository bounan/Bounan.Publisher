import * as cfn from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { LlrtFunction } from 'cdk-lambda-llrt';
import { Construct } from 'constructs';

import { Config as RuntimeConfig } from '../../app/src/config/types';
import { Config, getConfig } from './config';

export class Stack extends cfn.Stack {
    constructor(scope: Construct, id: string, props: cfn.StackProps) {
        super(scope, id, props);

        const config = getConfig(this, 'bounan:', '/bounan/publisher/deploy-config/');

        const updatePublishingDetailsLambda = lambda.Function.fromFunctionName(
            this, 'UpdatePublishingDetailsLambda', config.updatePublishingDetailsFunctionName);

        const table = this.createDatabase();
        const errorsLogGroup = this.createLogGroup();
        const parameter = this.saveParameters(table, config);
        const lambdas = this.createLambdas(table, errorsLogGroup, parameter);
        this.SetErrorsAlarm(errorsLogGroup, config);

        this.subscribeLambdaToTopic(LambdaHandler.OnVideoDownloaded, lambdas, config.videoDownloadedTopicArn);
        this.subscribeLambdaToTopic(LambdaHandler.OnScenesRecognised, lambdas, config.sceneRecognisedTopicArn);
        updatePublishingDetailsLambda.grantInvoke(lambdas[LambdaHandler.OnVideoDownloaded]);

        this.out('Config', config);
    }

    private createDatabase(): dynamodb.Table {
        return new dynamodb.Table(this, 'Table', {
            partitionKey: { name: 'AnimeKey', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            deletionProtection: true,
            readCapacity: 1,
            writeCapacity: 1,
        });
    }

    private createLogGroup(): logs.LogGroup {
        return new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_WEEK,
        });
    }

    private SetErrorsAlarm(logGroup: logs.ILogGroup, config: Config): void {
        const metricFilter = logGroup.addMetricFilter('ErrorMetric', {
            metricNamespace: this.stackName,
            metricName: 'ErrorCount',
            filterPattern: { logPatternString: 'ERROR' },
            metricValue: '1',
        });

        const metric = metricFilter.metric({ period: cfn.Duration.minutes(1) });

        const alarm = new cloudwatch.Alarm(this, 'Alarm', {
            metric: metric,
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        });

        const topic = new sns.Topic(this, 'ErrorsAlarmTopic');
        topic.addSubscription(new subscriptions.EmailSubscription(config.alertEmail));
        alarm.addAlarmAction(new cloudwatchActions.SnsAction(topic));
    }

    private createLambdas(
        table: dynamodb.Table,
        errorsLogGroup: logs.LogGroup,
        parameter: ssm.StringParameter,
    ): Record<LambdaHandler, lambda.Function> {
        // @ts-expect-error - we know that the keys are the same
        const functions: Record<LambdaHandler, lambda.Function> = {};

        Object.entries(LambdaHandler).forEach(([lambdaName, handlerName]) => {
            const func = new LlrtFunction(this, lambdaName, {
                entry: `src/handlers/${handlerName}/handler.ts`,
                handler: 'handler',
                logGroup: errorsLogGroup,
                timeout: cfn.Duration.seconds(30),
            });

            table.grantReadWriteData(func);
            parameter.grantRead(func);
            functions[handlerName] = func;
        });

        return functions;
    }

    private subscribeLambdaToTopic(
        handler: LambdaHandler,
        lambdas: Record<LambdaHandler, lambda.Function>,
        topicArn: string,
    ): void {
        const topic = sns.Topic.fromTopicArn(this, handler, topicArn);
        lambdas[handler].addEventSource(new lambdaEventSources.SnsEventSource(topic));
    }

    private saveParameters(table: dynamodb.Table, config: Config): ssm.StringParameter {
        const value = {
            animan: {
                updatePublishingDetailsFunctionName: config.updatePublishingDetailsFunctionName,
            },
            telegram: {
                token: config.telegramToken,
                sourceChannelId: config.telegramSourceChannelId,
                targetGroupId: config.telegramTargetGroupId,
            },
            database: {
                tableName: table.tableName,
            },
            retries: {
                max: cfn.Token.asNumber(config.retriesMax),
                delayMs: cfn.Token.asNumber(config.retriesDelayMs),
            },
        } as Required<RuntimeConfig>;

        return new ssm.StringParameter(this, '/bounan/publisher/runtime-config', {
            parameterName: '/bounan/publisher/runtime-config',
            stringValue: JSON.stringify(value, null, 2),
        });
    }

    private out(key: string, value: object | string): void {
        const output = typeof value === 'string' ? value : JSON.stringify(value);
        new cfn.CfnOutput(this, key, { value: output });
    }
}

enum LambdaHandler {
    OnVideoDownloaded = 'on-video-downloaded',
    OnScenesRecognised = 'on-scenes-recognised',
}
