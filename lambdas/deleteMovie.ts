import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

   
    const pathParams = event.pathParameters || {};
    const movieId = pathParams.movieId ? parseInt(pathParams.movieId) : undefined;

    if (!movieId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing or invalid movieId in path" }),
      };
    }

    
    await ddbDocClient.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME, 
      Key: { id: movieId },
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Movie with id=${movieId} deleted.` }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
