import {validate} from '../index';
import * as yaml from 'js-yaml';

test('empty template', () => {
  const expected = {
    path: ['Root'],
    message: expect.stringMatching(/object/)
  };
  expect(validate('')[0]).toMatchObject(expected);
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

test('valid', () => {
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
