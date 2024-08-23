package main

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"log"
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
	Weight float64            `bson:"weight"`
	Sex    string             `bson:"sex"`
	Room   string             `bson:"room"`
}

func AddUser(name string, weight int, sex string, room string) error {
	_, err := collection.InsertOne(context.Background(), bson.D{
		{"name", name},
		{"weight", weight},
		{"sex", sex},
		{"room", room},
	})
	if err != nil {
		return fmt.Errorf("could not insert user: %w", err)
	}
	return nil
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
