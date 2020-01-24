const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");


const app = express();
app.use(cors({
    origin: "*"
}))


app.post("/track", async (req,res) => {
    try {
        const {value, userID, action} = req.body;
        switch(action){
            case 'survey':
                const {genre, age, education, income, country} = value;
                const studyGroup = ['A','B','C'][Math.round(Math.random()*2)]
                
                // write to firestore
                admin.firestore().collection("users").doc(userID).set({
                    genre: parseInt(genre) || -1, 
                    age: parseInt(age) || -1, 
                    education: parseInt(education) || -1, 
                    income: parseInt(income) || -1, 
                    studyGroup,
                    country: country || -1
                })

                res.send(studyGroup);
                return;
            
            case 'finish_study':
                // transform data
                const cartSize = value.reduce((sum, p) => sum + (p.quantity || 1),0);

                const mappedNutriscores = value.map( p => ['A','B','C','D','E'].indexOf(p.nutriScore) )
                const averageNutriscore = mappedNutriscores.reduce((sum, m) => sum+m,0)/mappedNutriscores.length;

                admin.firestore().collection('users').doc(userID).set({
                    cartSize,
                    cartPrice: value.reduce((sum, p) => sum + (parseFloat(p.price) * (p.quantity || 1) * (p.currency === 'chf' ? .91 : 1)), 0),
                    cartAvgNutriscore: ['A','B','C','D','E'][Math.round(averageNutriscore)],
                    cartItems: value.map(p => ({...p, quantity: p.quantity || 1}))
                }, { merge: true });
                
                res.send({ok:true})
                return;

            case 'track_page':
                const {category, timeSpent, pageUrl, title} = value;

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:'page_view',
                    timestamp: new Date().getTime(),
                    timeSpent,
                    category,
                    pageUrl,
                    title
                });
                res.end()
                return
            case 'track_cart':
                const {product, add_remove} = value;

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:add_remove === 'add' ? 'add_to_cart' : 'remove_from_cart',
                    timestamp: new Date().getTime(),
                    product: {
                        currency: product.currency,
                        gtin: product.gtin,
                        category: product.category,
                        name: product.name.trim(),
                        price: parseFloat(product.price),
                        img: product.img,
                        nutriScore: product.nutriScore
                    }
                });
                res.end()
                return
        }
        res.status(300).send("Invalid Request")
    }catch(e){
        console.log(e)
        res.status(500).send("error")
    }
    
})



module.exports = app;