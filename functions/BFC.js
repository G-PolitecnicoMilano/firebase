const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");


const app = express();
app.use(cors({
    origin: "*"
}))
// C is the control group
app.get('/group', (req, res) => {
    res.send(['A','C'][Math.floor(Math.random()*2)])
})

app.post("/track", async (req,res) => {
    console.log(req.body)
    try {
        const {value, userID, action} = req.body;
        switch(action){
            case 'survey':
                const {genre, age, education, income, country, studyUserID, studyGroup} = value;
                
                // write to firestore
                admin.firestore().collection("users").doc(userID).set({
                    genre: genre || -1, 
                    age: age || -1, 
                    education: education || -1, 
                    income: income || -1, 
                    studyGroup:studyGroup || -1,
                    studyUserID: studyUserID|| -1,
                    country: country || -1
                })

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:'start_shopping',
                    timestamp: new Date().getTime(),
                });

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
                    cartItems: value.map(p => ({...p, quantity: p.quantity || 1, size: p.size || false}))
                }, { merge: true });

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:'finish_shopping',
                    timestamp: new Date().getTime(),
                });

                res.send({ok:true})
                return;

            case 'track_page':
                const {category, timeSpent, pageUrl, title, gtin,nutri_score, nutritionTable} = value;

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:'page_view',
                    timestamp: new Date().getTime(),
                    timeSpent: timeSpent || false,
                    category: category || false,
                    gtin: gtin || false,
                    nutritionTable: nutritionTable || false,
                    nutri_score: nutri_score || false,
                    pageUrl: pageUrl || false,
                    title: title || false
                });
                res.end()
                return
            case 'track_cart':
                const {product, add_remove} = value;
                console.log(product)

                admin.firestore().collection('users').doc(userID).collection('events').doc().set({
                    eventName:add_remove === 'add' ? 'add_to_cart' : 'remove_from_cart',
                    timestamp: new Date().getTime(),
                    product: {
                        currency: product.currency || false,
                        gtin: product.gtin|| false,
                        category: product.category|| false,
                        name: product.name|| false,
                        nutritionTable: product.nutritionTable || false,
                        size: product.size|| false,
                        price: parseFloat(product.price)|| false,
                        img: product.img|| false,
                        nutriScore: product.nutriScore|| false
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
