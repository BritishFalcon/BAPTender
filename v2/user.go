package main

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"log"
	"math"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var collection *mongo.Collection

type User struct {
	ID     primitive.ObjectID `bson:"_id,omitempty"`
	Name   string             `bson:"name"`
	Weight int                `bson:"weight"`
	Sex    string             `bson:"sex"`
	Room   string             `bson:"room"`
	BAC    float64            `bson:"bac"`
}

func AddUser(name string, weight int, sex string, room string, bac float64) error {
	_, err := collection.InsertOne(context.Background(), bson.D{
		{"name", name},
		{"weight", weight},
		{"sex", sex},
		{"room", room},
		{"bac", bac},
	})
	if err != nil {
		return fmt.Errorf("could not insert user: %w", err)
	}
	return nil
}

func CalculateBACChange(currentBAC float64, weight float64, sex string) float64 {
	var metabolismRate float64

	if sex == "Male" {
		metabolismRate = 0.015
	} else if sex == "Female" {
		metabolismRate = 0.017
	} else {
		fmt.Println("Invalid sex provided. Please use 'male' or 'female'.")
		return currentBAC
	}
	metabolismRatePerSecond := metabolismRate / 3600
	bacDecrease := metabolismRatePerSecond * 10
	newBAC := math.Max(0, currentBAC-bacDecrease)

	return newBAC
}

func GetAllUsers() []User {
	cursor, err := collection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	defer func(cursor *mongo.Cursor, ctx context.Context) {
		err := cursor.Close(ctx)
		if err != nil {
			log.Fatal(err)
		}
	}(cursor, context.Background())
	var users []User
	for cursor.Next(context.Background()) {
		var user User
		if err := cursor.Decode(&user); err != nil {
			log.Fatal(err)
		}
		if user.BAC > 0 {
			users = append(users, user)
		}
		//TODO sort by room (you can do this outside the loop after collecting all users)
	}
	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}
	return users
}

func GlugGlug(currentBAC float64, sex string, weight float64, drinkVolume float64, drinkStrength float64) float64 {
	var r float64
	if sex == "Male" {
		r = 0.68 // Average alcohol distribution ratio for men
	} else if sex == "Female" {
		r = 0.55 // Average alcohol distribution ratio for women
	} else {
		fmt.Println("Invalid sex provided. Please use 'Male' or 'Female'.")
		return currentBAC
	}
	log.Printf("Vol: %.3f\nStr: %.3f\n", drinkVolume, drinkStrength)
	alcoholContent := drinkStrength / 100.0
	alcoholConsumed := drinkVolume * alcoholContent * 0.789 // Alcohol consumed in grams
	bacIncrease := alcoholConsumed / (weight * r * 1000) * 100

	newBAC := currentBAC + bacIncrease
	log.Printf("BAC: %.3f\n", bacIncrease)
	return newBAC
}

func UpdateBAC(name string, newBac float64) error {
	_, err := collection.UpdateOne(context.Background(), bson.M{"name": name}, bson.D{
		{"$set", bson.D{
			{"bac", newBac},
		}},
	})
	if err != nil {
		return fmt.Errorf("could not update bac: %w", err)
	}
	return nil
}

func GetAllUserBac() map[string]float64 {
	cursor, err := collection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}

	defer func(cursor *mongo.Cursor, ctx context.Context) {
		err := cursor.Close(ctx)
		if err != nil {
			log.Fatal(err)
		}
	}(cursor, context.Background())

	var userBacMap = make(map[string]float64)

	for cursor.Next(context.Background()) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			log.Fatal(err)
		}
		if result["bac"].(float64) > 0 {
			userBacMap[result["name"].(string)] = result["bac"].(float64)
		}
		//TODO sort by room
	}

	return userBacMap
}

func init() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Error in reading .env file: %v\n", err)
		os.Exit(1)
	}

	// Get MongoDB connection string from .env
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not set in environment")
	}

	// Set up MongoDB client options
	clientOptions := options.Client().ApplyURI(mongoURI)

	// Connect to MongoDB
	log.Printf("Connecting to MongoDB at %s\n", mongoURI)
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	// Ping the MongoDB server to ensure connection is working
	log.Printf("Pinging MongoDB at %s\n", mongoURI)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Could not connect to MongoDB: ", err)
	}

	fmt.Println("Connected to MongoDB!")

	collection = client.Database("Baptender").Collection("users")
	go bacTicker()
	go handleMessages()
	go SendMessage()
}

func DBTest() {
	// Load environment variables from .env
	if err := godotenv.Load(); err != nil {
		log.Printf("Error in reading .env file: %v\n", err)
		os.Exit(1)
	}

	// Get MongoDB connection string from .env
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not set in environment")
	}

	// Set up MongoDB client options
	clientOptions := options.Client().ApplyURI(mongoURI)

	// Connect to MongoDB
	log.Printf("Connecting to MongoDB at %s\n", mongoURI)
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	// Disconnect the client at the end of the program
	defer func() {
		log.Printf("Disconnecting to MongoDB at %s\n", mongoURI)
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Fatal(err)
		}
	}()

	// Ping the MongoDB server to ensure connection is working
	log.Printf("Pinging MongoDB at %s\n", mongoURI)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Could not connect to MongoDB: ", err)
	}

	fmt.Println("Connected to MongoDB!")

	collection := client.Database("Baptender").Collection("delete_me")
	log.Printf("Searching for delete_me in MongoDB at %s\n", mongoURI)

	// Find all documents in the collection
	cursor, err := collection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}

	log.Println(cursor)
	defer func(cursor *mongo.Cursor, ctx context.Context) {
		err := cursor.Close(ctx)
		if err != nil {
			log.Fatal(err)
		}
	}(cursor, context.Background())

	// Iterate through the cursor and print documents
	for cursor.Next(context.Background()) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			log.Fatal(err)
		}
		fmt.Println(result)
	}

	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}
}
