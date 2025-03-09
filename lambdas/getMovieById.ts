import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand,QueryCommand, QueryCommandInput, } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { 
  try {
    
    console.log("Event: ", JSON.stringify(event)); 
    let movieId: number | undefined;
    if (event?.pathParameters?.movieId) {
      movieId = parseInt(event.pathParameters.movieId);
    } else if (event?.queryStringParameters?.movieId) {
      movieId = parseInt(event.queryStringParameters.movieId);
    }

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }
    const castQueryParam = event.queryStringParameters?.cast || "";
    const includeCast = castQueryParam.toLowerCase() === "true";
    let castData: any[] = [];
    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );
    console.log("GetCommand response: ", commandOutput);
    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }
    if (includeCast) {
      const castTableName = process.env.MOVIE_CAST_TABLE_NAME ?? "MovieCast";
      const castCommandInput: QueryCommandInput = {
        TableName: castTableName,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
          ":m": movieId,
        },
      };

      
      const castCommandOutput = await ddbDocClient.send(
        new QueryCommand(castCommandInput)
      );
      console.log("QueryCommand response (Cast): ", castCommandOutput);

      castData = castCommandOutput.Items || [];
    }

    const body = {
      data: commandOutput.Item,
      ...(includeCast ? { cast: castData } : {}),
    };

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
