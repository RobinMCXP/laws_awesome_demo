  /**
  *  LAWS - AWS Lambda
  *
  **/

  'use strict';

  var im = require('simple-imagemagick'),
    crypto = require("crypto"),
    fs = require('fs'),
    aws = require('aws-sdk'),
    s3 = new aws.S3({ apiVersion: '2006-03-01' }),
    async = require('async');

  var bucketFormInput = 'INPUT BUCKET';
  var bucketResizeInput = 'PROCESSED BUCKET';
  var outputFile = '';

/**
* Create AWS signature to upload images on Amazon S3
*/
  exports.getSignature = function(event, context) {
    var accessKey = getAccessKey();
    var secretKey = getSecretKey();
    //Create expiration date of the signature. (10 minutes)
    var expirationTimestamp = Math.floor(Date.now() / 1000) + 600;
    var expirationDate = new Date(expirationTimestamp*1000);
    //Create a random string key
    var key = makeKey();
    //Create the policy (AWS Format) (Contain expiration date, bucket, security, ...)
    var policy = {
      expiration: expirationDate.toISOString(),
      conditions: [ 
      {bucket: bucketFormInput}, 
      ["starts-with", "$key", ""],
      {acl: "private"},
      ["starts-with", "$Content-Type", ""],
      ["content-length-range", 0, 10485761515555]
      ]
    }

      //Encode policy in base 64
      var stringPolicy = JSON.stringify(policy);
      var base64Policy = Buffer(stringPolicy).toString('base64');
      // sign the base64 encoded policy
      var signature = crypto.createHmac('sha1', secretKey)
      .update(new Buffer(base64Policy, 'utf-8')).digest('base64');
      //Url for the form
      var url = 'https://' + bucketFormInput + '.s3.amazonaws.com/';
      //Creation of the response
      var response = {
        fileName: key,
        policy: base64Policy,
        signature: signature,
        accessKey: accessKey,
        url: url
      }

      context.succeed(response);
    }

  exports.processImage = function(event, context) { 
      //Initialisation
      var resizeParams = [];
      //Get the Key and the bucket of the S3 file from the event params
      var myImage = event.Records[0].s3.object.key;
      var myBucket = event.Records[0].s3.bucket.name;
      var getObjectParams = {
        Bucket: myBucket,
        Key: myImage
      }

      //Get the file from Amazon S3 
      s3.getObject(getObjectParams, function(err, data) {
        handleError(err, context);
        //Write the file on the filesystem
        var pathFile = '/tmp/input.png'
        fs.writeFile(pathFile, data.Body, function(err){
         handleError(err, context);
         //Creation of the params to resize the image
         resizeParams.push(pathFile);
         outputFile = createResizeParams(resizeParams);
         //Call simple imagemagick to resize the image and write the result in filesystem (outputfile)
         im.convert(resizeParams, function(err, stdout){
          handleError(err, context);
          //Creation of the negate params with the resize image
          var negateParams = [outputFile];
          //outputFile = createNegateParams(negateParams);
          outputFile = createFlipParams(negateParams);
          //Call simple imagemagick to negate the image
          im.convert(negateParams, function(err, stdout){
            handleError(err, context);
            //Read the filesystem to put the processed image back into S3
            fs.readFile(outputFile, function(err,data){
              handleError(err, context);
              //Creation of the S3 params to put object
              var key = makeKey()+'.png';
              var paramsPutObject = {
                Bucket: bucketResizeInput,
                Key: key,
                Body: data
              };
              //Put the processed image into S3
              s3.putObject(paramsPutObject, function(err,data){
                handleError(err, context);
                context.succeed(data);
              });
            });
          });
        });
       });
      });
    };

  /**
  * Get Multiple images from S3 and make a mozaic
  */
  exports.getMozaic = function(event, context) {
   var listObjectParams = {
    Bucket: bucketResizeInput,
    Prefix: "",
    MaxKeys: 50
  };
  var montageParams = [];
  //We list 50 files or less from S3 (processed images)
  s3.listObjects(listObjectParams, function(err, data) {
    handleError(err, context);
    if(data.Contents.length === 0) context.done("No file are store in S3");
    //We get each of these files from S3. (async process)
    async.each(data.Contents, function(object, asyncCb) {
      var paramsGetObject = {
        Bucket: bucketResizeInput,
        Key: object.Key
      }
      //Get a file from S3 and write it on the filesystem and add path to mozaic params
      s3.getObject(paramsGetObject, function(err, result) {
        handleError(err, context);
        if(result.ContentLength > 0) {
          var filePath = "/tmp/"+object.Key;
          fs.writeFile(filePath, result.Body, function(err) {
            handleError(err, context);
            montageParams.push(filePath);  
            asyncCb(err);
          });  
        } else {
            asyncCb();
        }
    });
    }, function(err) {
      handleError(err, context);
      //Set the last params to create the mozaic
      outputFile = createMontageParams(montageParams);
      //make the mozaic
      im.montage(montageParams, function(err, stdout){
        handleError(err, context);
        //Pass the image into a buffer encoded in base64
        fs.readFile(outputFile, function(err,data){
          handleError(err, context);
          var response  = {
            img : "data:image/png;base64," + data.toString("base64")
          }
           context.succeed(response);
        });
      });
    });
  });
};

/**
* On error call context.fail with the error
*/
function handleError(err, context) {
  if(err) context.fail(err);
}

/*
* Add missing params to resize an image and return the path of the outputfile
*/
function createResizeParams(params) {
  params.push('-resize');
  var geometry = '200x250';
  params.push(geometry);
  var outputFile = '/tmp/output-cropped.png';
  params.push(outputFile);
  return outputFile;
}

/**
* Add missing params to apply a negate filter and return the path of the outputfile
*/
function createNegateParams(params) {
  params.push('-negate');
  var outputFile = '/tmp/output-cropped-negate.png'
  params.push(outputFile);
  return outputFile;
}

/**
* Add missing params to apply a negate filter and return the path of the outputfile
*/
function createFlipParams(params) {
  params.push('-flip');
  var outputFile = '/tmp/output-cropped-negate.png'
  params.push(outputFile);
  return outputFile;
}

/**
* Add missing params to create a mozaic of multiple image and return the path of the outputfile
*/
function createMontageParams(params) {
  params.push('-title');
  var title = "";
  params.push(title);
  params.push('-geometry');
  var geometry = '+0+0';
  params.push(geometry);
  var outputFile = '/tmp/output-mozaic.png'
  params.push(outputFile);
  return outputFile;
}

/**
* Create random string of 10 caraters
*/
function makeKey()
{
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for( var i=0; i < 10; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function getAccessKey() {
  var accessKey = "PUT AWS ACCESS KEY";
  return accessKey;
}

function getSecretKey() {
  var secretKey = "PUT AWS SECRET KEY";
  return secretKey;
}