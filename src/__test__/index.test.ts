import {validate} from '../index';
import * as yaml from 'js-yaml';

test('empty template', () => {
  const expected = {
    path: ['Root'],
    message: expect.stringMatching(/object/)
  };
  expect(validate('')[0]).toMatchObject(expected);
});

test('Description as invalid string', () => {
  const template = yaml.dump({
    Description: 'test',
    Resources: {}
  });
  expect(validate(template)).toEqual([]);
});

test('Description as non-string', () => {
  const expected = [{
    path: ['Root', 'Description'],
    message: expect.stringMatching(/string/)
  }];
  const template = yaml.dump({
    Description: {},
    Resources: {}
  });
  expect(validate(template)).toMatchObject(expected);
});

test('AWSTemplateFormatVersion as valid string', () => {
  const template = yaml.dump({
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {}
  });
  expect(validate(template)).toEqual([]);
});

test('AWSTemplateFormatVersion as valid string', () => {
  const expected = [{
    path: ['Root', 'AWSTemplateFormatVersion'],
    message: expect.stringMatching(/format/)
  }];
  const template = yaml.dump({
    AWSTemplateFormatVersion: 'test',
    Resources: {}
  });
  expect(validate(template)).toMatchObject(expected);
});

test('AWSTemplateFormatVersion as non-string', () => {
  const expected = [{
    path: ['Root', 'AWSTemplateFormatVersion'],
    message: expect.stringMatching(/string/)
  }];
  const template = yaml.dump({
    AWSTemplateFormatVersion: {},
    Resources: {}
  });
  expect(validate(template)).toMatchObject(expected);
});

test('missing resources', () => {
  const expected = [{
    path: ['Root', 'Resources'],
    message: expect.stringMatching(/required/)
  }];
  expect(validate('{}')).toMatchObject(expected);
});

test('required property', () => {
  const expected =  [
    {
      path: ['Root', 'Resources', 'RecordSet', 'Name'],
      message: expect.stringMatching(/required/)
    }
  ]
  const template = yaml.dump({
    Resources: {
      RecordSet: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {}
      }
    }
  });
  expect(validate(template)).toMatchObject(expected);
});

test('invalid Type', () => {
  const expected = [
    {
      path: ['Root', 'Resources', 'FooBar', 'Type'],
      message: expect.stringMatching(/invalid/)
    }
  ];
  const template = yaml.dump({
    Resources: {
      FooBar: {
        Type: 'AWS::Foo::Bar',
        Properties: {}
      }
    }
  });
  expect(validate(template)).toMatchObject(expected);
});

test('invalid resource property primitive type', () => {
  const expected = [
    {
      path: ['Root', 'Resources', 'Bucket', 'Properties', 'BucketName'],
      message: expect.stringMatching(/String/)
    }
  ];
  const template = yaml.dump({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: {}
        }
      }
    }
  });
  expect(validate(template)).toMatchObject(expected);
});

test('invalid resource property type', () => {
  const expected = [
    {
      path: ['Root', 'Resources', 'Bucket', 'Properties', 'Tags'],
      message: expect.stringMatching(/List/)
    }
  ];
  const template = yaml.dump({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          Tags: {}
        }
      }
    }
  });
  expect(validate(template)).toMatchObject(expected);
});

test('invalid resource property list type', () => {
  const expected = [
    {
      path: ['Root', 'Resources', 'Bucket', 'Properties', 'Tags', '0'],
      message: expect.stringMatching(/object/)
    }
  ];
  const template = yaml.dump({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          Tags: ['foo']
        }
      }
    }
  });
  expect(validate(template)).toMatchObject(expected);
});

test('valid template', () => {
  const template = yaml.dump({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {}
      }
    }
  });
  expect(validate(template)).toEqual([]);
});
