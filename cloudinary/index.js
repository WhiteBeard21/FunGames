const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: 'dnyuashia',
    api_key: 687883922331518,
    api_secret: 'b6RPS4oW1ISJXiVzzjjfTAp-_-k'
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'CroolGames',
        allowedFormats: ['jpeg', 'png', 'jpg']
    }
});

module.exports = {
    cloudinary,
    storage
}