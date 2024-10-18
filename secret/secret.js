require('dotenv').config();

const secret = {
       port:process.env.PORT,
       mongodb:process.env.MONGODB_URL,
       jwtsecret:process.env.JWT_SECRETS,
       awssecretaccesskey:process.env.AWS_SECRET_ACCESS_KEY,
       awsaccesskeyid:process.env.AWS_ACCESS_KEY_ID,
       awsbucketname:process.env.AWS_BUCKET_NAME,
       awsregion:process.env.AWS_REGION
}

module.exports = secret ;