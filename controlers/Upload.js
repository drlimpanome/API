import AWS from 'aws-sdk';
import fs from 'fs'

AWS.config.update({
    accessKeyId: process.env.ACESS_KEY_AWS,
    secretAccessKey: process.env.SECRET_ACESS_KEY_AWS,
    region: 'us-east-1',
  });
  
// Criar uma instância do S3
const s3 = new AWS.S3();


// Upload file to S3 function
export function uploadFileToS3(url, fileName) {
    const fileStream = fs.createReadStream(url);
  
    const params = {
      Bucket: 'consult-document-bucket',
      Key: fileName,
      Body: fileStream,
      ContentType: 'application/pdf'
    };
  
    return s3.upload(params).promise();
  }
  
  // Generate presigned URL function
export  function generatePresignedUrl(fileName) {
    const params = {
      Bucket: 'consult-document-bucket',
      Key: fileName,
      Expires: 604800,
    };
  
    return new Promise((resolve, reject) => {
      s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  }