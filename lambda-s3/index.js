// Dependencies
const async = require('async');
const AWS = require('aws-sdk');
const gm = require('gm')
  .subClass({ imageMagick: true }); // Enable ImageMagick integration.
const util = require('util');

// Constants
const MAX_WIDTH = 50;
const MAX_HEIGHT = 50;

// Get reference to S3 client 
const s3 = new AWS.S3();

exports.handler = function (event, context, callback) {
  // Read options from the event.
  console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
  let srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  let srcKey =
    decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  console.log("srcKey: " + srcKey);
  let dstBucket = srcBucket + "resized";
  let dstKey = "resized-" + srcKey;

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == dstBucket) {
    console.log("CALLBACK 1");
    callback("Source and destination buckets are the same.");
    return;
  }

  // Infer the image type.
  let typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("CALLBACK 2 errpr");

    callback("Could not determine the image type.");
    return;
  }
  let imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png") {
    console.log("CALLBACK 4");

    callback(`Unsupported image type: ${imageType}`);
    return;
  }

  // Download the image from S3, transform, and upload to a different S3 bucket.
  async.waterfall([
    function download(next) {
      console.log("in waterfall download");

      // Download the image from S3 into a buffer.
      s3.getObject({
        Bucket: srcBucket,
        Key: srcKey
      },
        next);
    },
    function transform(response, next) {

      gm(response.Body).size(function (err, size) {

        // Infer the scaling factor to avoid stretching the image unnaturally.
        let scalingFactor = Math.min(
          MAX_WIDTH / size.width,
          MAX_HEIGHT / size.height
        );
        let width = scalingFactor * size.width;
        let height = scalingFactor * size.height;

        // Transform the image buffer in memory.
        this.resize(width, height)
          .toBuffer(imageType, function (err, buffer) {
            if (err) {
              next(err);
            } else {
              next(null, response.ContentType, buffer);
            }
          });
      });
    },
    function upload(contentType, data, next) {
      // Stream the transformed image to a different S3 bucket.
      s3.putObject({
        Bucket: dstBucket,
        Key: dstKey,
        Body: data,
        ContentType: contentType
      },
        next);
    }
  ], function (err) {
    if (err) {
      console.error(
        'Unable to resize ' + srcBucket + '/' + srcKey +
        ' and upload to ' + dstBucket + '/' + dstKey +
        ' due to an error: ' + err
      );
    } else {
      console.log(
        'Successfully resized ' + srcBucket + '/' + srcKey +
        ' and uploaded to ' + dstBucket + '/' + dstKey
      );
    }

    callback(null, "message");
  }
  );
};
