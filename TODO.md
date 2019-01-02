# Todo

- [ ] Error on duplicate resource names (parameters, outputs, etc)
- [ ] Support `AWS::Serverless::*` types
- [ ] Support AWS Serverless "Globals"
- [ ] Support `Custom::*` types
- [ ] UpdatePolicy conditionals: `If you specify the MinSuccessfulInstancesPercent property, you must also enable the WaitOnResourceSignals and PauseTime properties.`
- [ ] `AWS::Route53::RecordSetGroup.HostedZoneName` `If this record set is part of a record set group, do not specify this property`
- [ ] Inclusive with "or": `AWS::EC2::EIPAssociation` `If you specify the AllocationId property, you must specify InstanceId or NetworkInterfaceId property`
- [ ] Inclusive/Exclusive that are dependant on the contents of the property:
  ```
  $ grep -R -B 4 'Conditional.*If' . | grep -v 'Type|Update Requires' | grep -v '.md-$' | pbcopy
  [snip]
./doc_source/aws-resource-dynamodb-table.md-*Update requires*: [No interruption](using-cfn-updating-stacks-update-behaviors.md#update-no-interrupt)
./doc_source/aws-resource-dynamodb-table.md-`ProvisionedThroughput`  <a name="cfn-dynamodb-table-provisionedthroughput"></a>
./doc_source/aws-resource-dynamodb-table.md-Throughput for the specified table, which consists of values for `ReadCapacityUnits` and `WriteCapacityUnits`\. For more information about the contents of a provisioned throughput structure, see [Amazon DynamoDB Table ProvisionedThroughput](aws-properties-dynamodb-provisionedthroughput.md)\.
./doc_source/aws-resource-dynamodb-table.md:*Required*: Conditional\. If you set `BillingMode` as `PROVISIONED`, you must specify this property\. If you set `BillingMode` as `PAY_PER_REQUEST`, you cannot specify this property\.
--
./doc_source/aws-properties-ec2-security-group-ingress.md-`SourceSecurityGroupOwnerId`  <a name="cfn-ec2-security-group-ingress-sourcesecuritygroupownerid"></a>
./doc_source/aws-properties-ec2-security-group-ingress.md-Specifies the AWS Account ID of the owner of the Amazon EC2 security group specified in the `SourceSecurityGroupName` property\.
./doc_source/aws-properties-ec2-security-group-ingress.md-*Type*: String
./doc_source/aws-properties-ec2-security-group-ingress.md:*Required*: Conditional\. If you specify `SourceSecurityGroupName` and that security group is owned by a different account than the account creating the stack, you must specify the `SourceSecurityGroupOwnerId`; otherwise, this property is optional\.
--
./doc_source/aws-properties-dynamodb-gsi.md-*Type*: [Projection](aws-properties-dynamodb-projectionobject.md)
./doc_source/aws-properties-dynamodb-gsi.md-`ProvisionedThroughput`  <a name="cfn-dynamodb-gsi-provisionthroughput"></a>
./doc_source/aws-properties-dynamodb-gsi.md-The provisioned throughput settings for the index\.
./doc_source/aws-properties-dynamodb-gsi.md:*Required*: Conditional\. If you set `BillingMode` as `PROVISIONED`, you must specify this property\. If you set `BillingMode` as `PAY_PER_REQUEST`, you cannot specify this property\.
--
./doc_source/aws-properties-codebuild-project-source.md-*Type*: Boolean
./doc_source/aws-properties-codebuild-project-source.md-`Location`  <a name="cfn-codebuild-project-source-location"></a>
./doc_source/aws-properties-codebuild-project-source.md-The location of the source code in the specified repository type\. For more information, see the [https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html#create-project-cli](https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html#create-project-cli) field in the *AWS CodeBuild User Guide*\.
./doc_source/aws-properties-codebuild-project-source.md:*Required*: Conditional\. If you specify `CODEPIPELINE` for the `Type` property, don't specify this property\. For all of the other types, you must specify this property\.
--
./doc_source/aws-properties-opsworks-layer-volumeconfig.md-*Type*: Boolean
./doc_source/aws-properties-opsworks-layer-volumeconfig.md-`Iops`  <a name="cfn-opsworks-layer-volconfig-iops"></a>
./doc_source/aws-properties-opsworks-layer-volumeconfig.md-The number of I/O operations per second \(IOPS\) to provision for the volume\.
./doc_source/aws-properties-opsworks-layer-volumeconfig.md:*Required*: Conditional\. If you specify `io1` for the volume type, you must specify this property\.
--
./doc_source/aws-resource-elasticloadbalancingv2-listener.md-`Certificates`  <a name="cfn-elasticloadbalancingv2-listener-certificates"></a>
./doc_source/aws-resource-elasticloadbalancingv2-listener.md-The SSL server certificate for the listener\. With a certificate, you can encrypt traffic between the load balancer and the clients that initiate HTTPS sessions, and traffic between the load balancer and your targets\.
./doc_source/aws-resource-elasticloadbalancingv2-listener.md-This property represents the default certificate for the listener\. You can specify only one certificate for the `AWS::ElasticLoadBalancingV2::Listener` resource\.
./doc_source/aws-resource-elasticloadbalancingv2-listener.md:*Required*: Conditional\. If you specify `HTTPS` for the `Protocol` property, specify a certificate\.
--
./doc_source/aws-properties-codebuild-project-artifacts.md-*Type*: Boolean
./doc_source/aws-properties-codebuild-project-artifacts.md-`Location`  <a name="cfn-codebuild-project-artifacts-location"></a>
./doc_source/aws-properties-codebuild-project-artifacts.md-The location where AWS CodeBuild saves the build output artifacts\. For valid values, see the [https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html#create-project-cli](https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html#create-project-cli) field in the *AWS CodeBuild User Guide*\.
./doc_source/aws-properties-codebuild-project-artifacts.md:*Required*: Conditional\. If you specify `CODEPIPELINE` or `NO_ARTIFACTS` for the `Type` property, don't specify this property\. For all of the other types, you must specify this property\.
./doc_source/aws-properties-codebuild-project-artifacts.md-*Type*: String
./doc_source/aws-properties-codebuild-project-artifacts.md-`Name`  <a name="cfn-codebuild-project-artifacts-name"></a>
./doc_source/aws-properties-codebuild-project-artifacts.md-The name of the build output folder where AWS CodeBuild saves the build output artifacts\. For \.zip packages, the name of the build output \.zip file that contains the build output artifacts\.
./doc_source/aws-properties-codebuild-project-artifacts.md:*Required*: Conditional\. If you specify `CODEPIPELINE` or `NO_ARTIFACTS` for the `Type` property, don't specify this property\. For all of the other types, you must specify this property\.
--
./doc_source/aws-properties-apitgateway-method-integration.md-The Uniform Resource Identifier \(URI\) for the integration\.
./doc_source/aws-properties-apitgateway-method-integration.md-If you specify `HTTP` for the `Type` property, specify the API endpoint URL\.
./doc_source/aws-properties-apitgateway-method-integration.md-If you specify `MOCK` for the `Type` property, don't specify this property\.
./doc_source/aws-properties-apitgateway-method-integration.md-If you specify `AWS` for the `Type` property, specify an AWS service that follows this form: `arn:aws:apigateway:region:subdomain.service|service:path|action/service_api`\. For example, a Lambda function URI follows this form: `arn:aws:apigateway:region:lambda:path/path`\. The path is usually in the form `/2015-03-31/functions/LambdaFunctionARN/invocations`\. For more information, see the `uri` property of the [Integration](https://docs.aws.amazon.com/apigateway/api-reference/resource/integration/) resource in the *Amazon API Gateway REST API Reference*\.
./doc_source/aws-properties-apitgateway-method-integration.md:*Required*: Conditional\. If you specified `HTTP` or `AWS` for the `Type` property, you must specify this property\.
--
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-## Properties<a name="w4ab1c21c10d135c13c15b7"></a>
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-`FleetId`  <a name="cfn-gamelift-alias-routingstrategy-fleetid"></a>
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-A unique identifier of a GameLift fleet to associate with the alias\.
./doc_source/aws-properties-gamelift-alias-routingstrategy.md:*Required*: Conditional\. If you specify `SIMPLE` for the `Type` property, you must specify this property\.
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-*Type*: String
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-`Message`  <a name="cfn-gamelift-alias-routingstrategy-message"></a>
./doc_source/aws-properties-gamelift-alias-routingstrategy.md-A text message that GameLift displays for the `Terminal` routing type\.
./doc_source/aws-properties-gamelift-alias-routingstrategy.md:*Required*: Conditional\. If you specify `TERMINAL` for the `Type` property, you must specify this property\.
--
./doc_source/aws-properties-rds-database-instance.md-`Iops`  <a name="cfn-rds-dbinstance-iops"></a>
./doc_source/aws-properties-rds-database-instance.md-The number of I/O operations per second \(IOPS\) that the database provisions\. The value must be equal to or greater than `1000`\.
./doc_source/aws-properties-rds-database-instance.md-If you specify this property, you must follow the range of allowed ratios of your requested IOPS rate to the amount of storage that you allocate \(IOPS to allocated storage\)\. For example, you can provision an Oracle database instance with `1000` IOPS and `200` GB of storage \(a ratio of 5:1\), or specify 2000 IOPS with 200 GB of storage \(a ratio of 10:1\)\. For more information, see [Amazon RDS Provisioned IOPS Storage to Improve Performance](https://docs.aws.amazon.com/AmazonRDS/latest/DeveloperGuide/CHAP_Storage.html#USER_PIOPS) in the *Amazon RDS User Guide*\.
./doc_source/aws-properties-rds-database-instance.md:*Required*: Conditional\. If you specify `io1` for the `StorageType` property, you must specify this property\.
  ```
