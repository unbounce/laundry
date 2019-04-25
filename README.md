# Laundry 👔

Air our your CloudFormation Templates.

## CLI

```
laundry [template]

Commands:
  laundry lint [template]  lint a template

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

```
$ cat test.yaml
Resources: ''
$ laundry lint test.yaml
Root.Resources: must be an Object, got "" [RootValidator]
```

## Library

```javascript
import { lint } from 'laundry';

// type Error = {
//     path: Path;
//     message: string;
//     source?: string;
// };
// function lint(template: string, parameters?: object): Error[]

lint('{}');
// => [{ path: ['Root', 'Resources'], message: 'is required'}]
```

Better validation can be done if parameter values are provided:

```javascript
lint('...', { ParamA: 1, ParamB: 'two'});
```

## Ignoring Errors

Errors can be ignored via the `LaundryIgnore` `Metadata` property. The top-level
`Metadata` property is specified as a map of paths within the CloudFormation
template, written in dot notation. The `*` character can be used as a glob to
match any value at that point in the path. For example, `Resources.MyBucket.*`
would match all errors related to the `MyBucket` resource, and `*.BucketName`
would ignore all errors related to properties called `BucketName`.

All `LaundryIgnore` properties in this example have the same effect:

```
Metadata:
  LaundryIgnore:
    # Match ResourcePropertyValidator errors for a specific property
    'Resources.A.Properties.Foo':
      - ResourcePropertyValidator
    # Match any ResourcePropertyValidator errors under "Resources.A"
    'Resources.A.*':
      - ResourcePropertyValidator
    # Match any ResourcePropertyValidator errors for properties named "Foo"
    '*.Foo':
      - ResourcePropertyValidator
    # Ignore all ResourcePropertyValidator errors
    '*':
      - ResourcePropertyValidator
Resources:
  A:
    Metadata:
      # Ignore ResourcePropertyValidator errors for this resource
      LaundryIgnore:
        - ResourcePropertyValidator
    Type: AWS::S3::Bucket
    Properties:
      Foo: bar
```

## Development

Run tests using `npm test` or to do so in "watch" mode, use `npm start`.

### Writing Additional Validators

Validation is done by "validators", which are
[visitors](https://en.wikipedia.org/wiki/Visitor_pattern) that are executed as
Laundry walks the structure of the CloudFormation template. Validators are small
in scope and typically assert a single property about a CloudFormation template.

Validators have the following structure and can implement any number of the
following methods:

```javascript
import { Validator } from './validate';

class SomethingValidator extends Validator {
  Root(path: Path, root: any): void { }
  AWSTemplateFormatVersion(path: Path, version: any): void { }
  Description(path: Path, description: any): void { }
  Metadata(path: Path, metadata: any): void { }
  Parameters(path: Path, parameters: any): void { }
  Mappings(path: Path, mappings: any): void { }
  Conditions(path: Path, conditions: any): void { }
  Transform(path: Path, transform: any): void { }
  Resources(path: Path, resources: any): void { }
  Outputs(path: Path, outputs: any): void { }
  Parameter(path: Path, parameter: any): void { }
  Mapping(path: Path, mapping: any): void { }
  Condition(path: Path, condition: any): void { }
  Resource(path: Path, resource: any): void { }
  CfnFn(path: Path, propertyName: string, value: CfnFn): void { }
  Output(path: Path, output: any): void { }
}
```

Existing validators can be seen in [`validators/`](./src/validators).

Validation functions are available in the [`validate`](./src/validate.ts) module
for common validation needs. These functions are designed to be chained so that
only one error message is created for each element. For example:

```javascript
validate.required(value) && validate.string(value);
```

This will create only check if `value` is a string if it is considered to be
present by the `requried` validation function. The functions return `false`
when a violation is found. They can be used within a conditional to perform
more complex validations, for example:

```javascript
if (validate.required(value) && validate.string(value)) {
  if(_.includes([...], value)) ...
}
```

See [`validate`](./src/validate.ts) for the full list of validation functions.


## CloudFormation Resource Specification

The majority of validation rules come from the [CloudFormation Resource
Specification](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-resource-specification.html).
This should be updated periodically using:

```
npm run update-resource-specification
```

## Goals

The goal is to be as comprehensive as
[awslabs/cfn-python-lint](https://github.com/awslabs/cfn-python-lint) but be
available for use within Javascript-based projects or environments where Python
is otherwise not available.
