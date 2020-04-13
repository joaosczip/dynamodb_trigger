const uuid = require("uuid");
const Joi = require("@hapi/joi");
const decoratorValidator = require("./util/decoratorValidator");
const globalEnum = require("./util/globalEnum");

class Handler {
  constructor({ dynamoSvc }) {
    this.dynamoSvc = dynamoSvc;
    this.dynamoTable = process.env.DYNAMODB_TABLE;
  }

  static validator() {
    return Joi.object({
      nome: Joi.string().max(100).min(2).required(),
      poder: Joi.string().max(100).min(2).required(),
    });
  }

  async insertItem(params) {
    return this.dynamoSvc.put(params).promise();
  }

  prepareData(data) {
    const params = {
      TableName: this.dynamoTable,
      Item: { ...data, id: uuid.v1(), createdAt: new Date().toISOString() },
    };

    return params;
  }

  handleSuccess(data) {
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  }

  handleError(data) {
    return {
      statusCode: data.statusCode || 501,
      headers: { "Content-Type": "text/plain" },
      body: "Couldn't create item!",
    };
  }

  async main(event) {
    try {
      const dbParams = this.prepareData(event.body);
      await this.insertItem(dbParams);

      return this.handleSuccess(dbParams.Item);
    } catch (error) {
      console.log("Error***", error.stack);
      return this.handleError({ statusCode: 500 });
    }
  }
}

const aws = require("aws-sdk");
const dynamoDB = new aws.DynamoDB.DocumentClient();
const handler = new Handler({
  dynamoSvc: dynamoDB,
});
module.exports = decoratorValidator(
  handler.main.bind(handler),
  Handler.validator(),
  globalEnum.ARG_TYPE.BODY
);
