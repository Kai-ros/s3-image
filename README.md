#README

## App Link
*(Taskmaster)[http://taskmaster-frontend-bh.s3-website-us-west-2.amazonaws.com/]

## Lambda Description
* ANytime a user adds an image to the app it will save the image to S3 which will then trigger the Resize lambda function.

## Pain Points
The CLI command
```
$ aws lambda create-function --function-name CreateThumbnail...
```
did not work for us so we had to utilize the GUI to upload the function.zip directly. In the process of doing so we didn't realize that the Runtime needed to be set to Node.js 8.10 which cost us quite a bit of time.
