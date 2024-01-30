const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;
const cloudinary=require('../cloudinary')
// https://res.cloudinary.com/dnyuashia/image/upload/w_200/v1705996932/CroolGames/uf853phzimalsta8so8r.jpg
const ImageSchema = new Schema({
    url: String,
    filename: String
})
// ImageSchema.virtual('cardImage').get(function(){
//    return this.url.replace('/upload/', '/upload/ar_4:3,c_crop/')
// })
ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload/', '/upload/w_200/')
})
const GamesSchema = new Schema({
    title: String,
    description: String,
    image: [ImageSchema],
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

GamesSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        try {
            await Review.deleteMany({
                _id: {
                    $in: doc.reviews
                }
            });
        } catch (error) {
            console.error('Error deleting associated reviews:', error);
        }
    }
});
// GamesSchema.post('findOneAndDelete', async function (doc) {
//     if (doc.reviews) {
//         await Review.deleteMany({
//             _id: { $in: doc.reviews }
//         });
//     }
//     if (doc.images) {
//         for (const img of doc.images) {
//             await cloudinary.uploader.destroy(img.filename);
//         }
//     }
// });
module.exports = mongoose.model('Games', GamesSchema);
