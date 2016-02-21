# LAWS - Awesome Lambda Demo

## How to create step by step with AWS Lambda, Amazon API Gateway and Amazon S3 a web app to upload and process images.

1. Step 1 - Prepare AWS Account

	Create an IAM User. Go to the service IAM. Create a new user and attach policy S3 full access

	Go to S3 service, create 2 new buckets, the first one will get file directly from the form and the second will recieve processed images. Go into properties of each of these buckets, permission then edit CORS and add POST in each of these buckets. (Don't forget to allow all headers in the first bucket)

2. Step 2 - Prepare source code

	npm install the project

	Replace buckets names at the top of index.js

	Replace access key and secret key (At the bottom of index.js) with the credential of your IAM user with full access to S3

	Make an archive zip (with git => git archive -o file.zip master)

3. Step 1 - Create your API

	Go to API Gateway service and just create a new API

	Go to lambda service and create a new function. Skip the sample code and upload the archive zip directly. In handle specify the first function getSignature (128 Mo RAM and 3 sec timeout)

	Repeat the operation but put in handler function processImage and getMozaic

	Add an endpoint HTTP (GET) for getSignature and getMozaic. Use the API you created in the first step. Give the same name for the route as the handlers name (or don't forget to change it in the frontend).

	Add event souce in the lambda processImage. Choose S3, the input bucket and created (ALL)

	Go to API Gateway, enable CORS for getSignature and getMozaic. (Don't forget to add "Origin" in Allow Header)

4. Last Step - Prepare your frontend

	Got the frontend folder and change into index.html the endpoint http of the API (line 88) and add the input bucket name in the URL of the form (line 150)

	Create a new Bucket S3, go to properties and enable web static hosting. 

	Upload index.html into this bucket and in action click on make it public.

5. Go to the url wich S3 give it to you (into properties -> web static) and you can test your API.

## Hope you enjoi the demo !


