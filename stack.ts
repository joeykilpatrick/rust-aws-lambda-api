import * as CDK from 'aws-cdk-lib';
import * as ACM from 'aws-cdk-lib/aws-certificatemanager';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Route53 from 'aws-cdk-lib/aws-route53';
import * as APIGateway from 'aws-cdk-lib/aws-apigateway';
import {transformAndValidateSync} from "class-transformer-validator";

import {Environment} from "./environment";

const environment: Environment = transformAndValidateSync(Environment, process.env, {validator: {validationError: {target: false}}});

const stackNameKebab: string = 'kilpatrick-cloud-rust-aws-lambda-api';

const app = new CDK.App();
const stack = new CDK.Stack(app, stackNameKebab, {
    env: {
        account: environment.ACCOUNT_ID,
        region: environment.REGION,
    },
})

const baseHostName = 'kilpatrick.cloud';
const hostedZoneId = environment.HOSTED_ZONE_ID;

const hostedZone = Route53.PublicHostedZone.fromHostedZoneAttributes(stack, `hostedZone`, {
    hostedZoneId: hostedZoneId,
    zoneName: baseHostName,
});

const apiDomainName: string = 'rust.api.kilpatrick.cloud';

const apiCertificate = new ACM.Certificate(stack, `apiCertificate`, {
    domainName: apiDomainName,
    validation: ACM.CertificateValidation.fromDns(hostedZone),
});

const apiFunction = new Lambda.Function(stack, 'apiFunction', {
    handler: 'not.required',
    code: Lambda.Code.fromAsset("./rust/target/x86_64-unknown-linux-musl/release", {exclude: ['**', '!bootstrap']}),
    functionName: `${stackNameKebab}-api-function`,
    runtime: Lambda.Runtime.PROVIDED_AL2,
    timeout: CDK.Duration.seconds(3),
});

const api = new APIGateway.LambdaRestApi(stack, 'api', {
    handler: apiFunction,
    restApiName: `${stackNameKebab}-api`,
    domainName: {
        certificate: apiCertificate,
        domainName: apiDomainName
    }
});
new Route53.CnameRecord(stack, `apiCnameRecord`, {
    zone: hostedZone,
    recordName: apiDomainName,
    domainName: api.domainName!.domainNameAliasDomainName, // Assertion okay, guaranteed above
});

app.synth();
