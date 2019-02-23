import { Error } from '../../types';
import arn from '../arn';

describe('arn', () => {
  test.each([
    ['arn:aws:iam::123456789012:user/Development/product_1234/*'],
    ['arn:aws:s3:::my_corporate_bucket/*'],
    ['arn:aws:route53:::hostedzone/Z148QEXAMPLE8V'],
    ['arn:aws:route53:::change/C2RDJ5EXAMPLE2'],
    ['arn:aws:route53:::change/*'],
    ['arn:aws:route53::123456789012:domain/example.com'],
    ['arn:aws:route53resolver:us-west-2:123456789012:resolver-rule/rslvr-rr-5328a0899aexample'],
    ['arn:aws:route53resolver:us-west-2:123456789012:resolver-endpoint/rslvr-in-60b9fd8fdbexample'],
    ['arn:aws:ec2:us-east-1:123456789012:instance/*'],
    ['arn:aws-cn:ec2:us-east-1:123456789012:instance/*'],
  ])('valid %s', (value) => {
    const errors: Error[] = [];
    expect(arn([], value, (path, message) => { errors.push({ path, message, source: '' }) })).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test.each([
    ['arn:aws:iam::123456789012'],
    ['arn:aws:iam:::user/Development/product_1234/*'],
    ['arn:aws:iam:us-east-1:123456789012:user/Development/product_1234/*'],
    ['arn:aws:s3:us-east-1::my_corporate_bucket/*'],
    ['arn:aws:s3::124356789012:my_corporate_bucket/*'],
    ['arn:aws:route53:us-east-1::hostedzone/Z148QEXAMPLE8V'],
    ['arn:aws:route53::123456789012:hostedzone/Z148QEXAMPLE8V'],
    ['arn:foo:ec2:us-east-1:123456789012:instance/*'],
    ['foo:aws:ec2:us-east-1:123456789012:instance/*'],
    ['arn:ec2:us-east-1:123456789012:instance/*'],
    ['arn:aws:us-east-1:123456789012:instance/*'],
    ['arn:aws:ec2:123456789012:instance/*'],
    ['arn:aws:ec2:us-east-1:instance/*'],
  ])('invalid %s', (value) => {
    const errors: Error[] = [];
    expect(arn([], value, (path, message) => { errors.push({ path, message, source: '' }) })).toBeFalsy();
    expect(errors.length).toBeGreaterThan(0);
  });
});
