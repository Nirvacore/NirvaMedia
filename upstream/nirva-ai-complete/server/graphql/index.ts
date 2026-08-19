/**
 * NMD GraphQL Server Integration
 * Apollo GraphQL server with websocket support for subscriptions
 */

import { typeDefs } from "./schema.ts";
import { resolvers } from "./resolvers.ts";

export interface GraphQLContext {
  organizationId: string;
  userId: string;
  isAdmin?: boolean;
}

export function getGraphQLConfig() {
  return {
    typeDefs,
    resolvers,
    introspection: true,
    debug: process.env.NODE_ENV === "development",
    formatError: (error: any) => ({
      message: error.message,
      code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
      path: error.path,
    }),
    context: async (args: any): Promise<GraphQLContext> => {
      // Extract context from request
      const authHeader = args.req?.headers?.authorization || "";
      const token = authHeader.replace("Bearer ", "");

      return {
        organizationId: args.req?.headers?.["x-organization-id"] || "org_default",
        userId: args.req?.headers?.["x-user-id"] || "user_anonymous",
        isAdmin: token === process.env.ADMIN_TOKEN,
      };
    },
  };
}

export { typeDefs, resolvers };
