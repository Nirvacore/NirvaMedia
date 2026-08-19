/**
 * NMD GraphQL Schema
 * Complete query/mutation/subscription interface for NMD infrastructure
 */

export const typeDefs = `
  type Query {
    # Content operations
    content(id: ID!): Content
    contentList(organizationId: ID!, status: ContentStatus): [Content!]!

    # Templates
    template(id: ID!): ContentTemplate
    templates(organizationId: ID!, category: String, limit: Int): [ContentTemplate!]!

    # Metrics
    metric(id: ID!): CustomMetric
    metrics(organizationId: ID!): [CustomMetric!]!
    metricReadings(metricId: ID!, limit: Int): [MetricReading!]!

    # Collaboration
    comments(contentId: ID!): [Comment!]!
    activityFeed(contentId: ID!): [ActivityLog!]!

    # Approval
    approvalTask(id: ID!): ApprovalTask
    approvalTasks(organizationId: ID!, status: String): [ApprovalTask!]!

    # Alerts
    alerts(organizationId: ID!): [Alert!]!
    alertRules(organizationId: ID!): [AlertRule!]!

    # ROI & Analytics
    roi(organizationId: ID!): ROIData!
    roiForecast(contentId: ID!, days: Int): ROIForecast!

    # Versions
    versions(contentId: ID!): [ContentVersion!]!

    # Webhooks
    webhooks(organizationId: ID!): [WebhookSubscription!]!
    webhookEvents(organizationId: ID!, limit: Int): [WebhookEvent!]!

    # Organization
    organization(id: ID!): Organization
    organizations(limit: Int): [Organization!]!

    # Health
    health: HealthStatus!
  }

  type Mutation {
    # Content
    createContent(input: CreateContentInput!): ContentPayload!
    updateContent(id: ID!, input: UpdateContentInput!): ContentPayload!
    deleteContent(id: ID!): DeletePayload!
    publishContent(id: ID!, platforms: [String!]!): PublishPayload!

    # Templates
    createTemplate(input: CreateTemplateInput!): TemplatePayload!
    updateTemplate(id: ID!, input: UpdateTemplateInput!): TemplatePayload!
    deleteTemplate(id: ID!): DeletePayload!

    # Metrics
    createMetric(input: CreateMetricInput!): MetricPayload!
    recordMetricReading(metricId: ID!, value: Float!): MetricReadingPayload!
    updateMetric(id: ID!, input: UpdateMetricInput!): MetricPayload!

    # Collaboration
    addComment(input: AddCommentInput!): CommentPayload!
    resolveComment(id: ID!): CommentPayload!

    # Approval
    createApprovalTask(input: CreateApprovalInput!): ApprovalPayload!
    approveStep(taskId: ID!, stepIndex: Int!, decision: String!): ApprovalPayload!

    # Alerts
    createAlertRule(input: CreateAlertInput!): AlertPayload!
    triggerAlert(input: TriggerAlertInput!): AlertPayload!

    # Webhooks
    subscribeWebhook(input: SubscribeWebhookInput!): WebhookPayload!
    unsubscribeWebhook(id: ID!): DeletePayload!
    triggerWebhookEvent(input: TriggerWebhookInput!): WebhookEventPayload!

    # Versioning
    createVersion(input: CreateVersionInput!): VersionPayload!
    rollbackVersion(contentId: ID!, versionId: ID!): VersionPayload!
  }

  type Subscription {
    contentCreated(organizationId: ID!): Content!
    contentPublished(organizationId: ID!): Content!
    alertTriggered(organizationId: ID!): Alert!
    webhookEvent(organizationId: ID!): WebhookEvent!
    metricUpdated(organizationId: ID!): CustomMetric!
  }

  # Types
  type Content {
    id: ID!
    title: String!
    body: String!
    tags: [String!]!
    status: ContentStatus!
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    versions: [ContentVersion!]!
    comments: [Comment!]!
    approvalTask: ApprovalTask
    publishResults: [PublishResult!]!
  }

  enum ContentStatus {
    DRAFT
    PENDING_REVIEW
    APPROVED
    SCHEDULED
    PUBLISHED
    ARCHIVED
  }

  type ContentTemplate {
    id: ID!
    organizationId: ID!
    name: String!
    description: String
    category: String!
    titleTemplate: String!
    bodyTemplate: String!
    tags: [String!]!
    metadata: JSON
    isPublic: Boolean!
    usageCount: Int!
    createdBy: String!
    createdAt: DateTime!
  }

  type CustomMetric {
    id: ID!
    organizationId: ID!
    name: String!
    description: String
    formula: String
    unit: String
    targetValue: Float
    currentValue: Float!
    isActive: Boolean!
    createdAt: DateTime!
    lastUpdatedAt: DateTime!
    readings(limit: Int): [MetricReading!]!
  }

  type MetricReading {
    id: ID!
    metricId: ID!
    value: Float!
    timestamp: DateTime!
  }

  type Comment {
    id: ID!
    contentId: ID!
    organizationId: ID!
    userId: String!
    text: String!
    mentions: [String!]!
    resolved: Boolean!
    createdAt: DateTime!
    resolvedAt: DateTime
    resolvedBy: String
  }

  type ActivityLog {
    id: ID!
    contentId: ID!
    userId: String!
    action: String!
    timestamp: DateTime!
  }

  type ContentVersion {
    id: ID!
    contentId: ID!
    versionNumber: Int!
    title: String!
    body: String!
    tags: [String!]!
    changeMessage: String
    createdBy: String!
    createdAt: DateTime!
  }

  type ApprovalTask {
    id: ID!
    contentId: ID!
    organizationId: ID!
    status: String!
    steps: [ApprovalStep!]!
    createdAt: DateTime!
    completedAt: DateTime
  }

  type ApprovalStep {
    index: Int!
    role: String!
    priority: String!
    approvedBy: String
    approvedAt: DateTime
    decision: String
  }

  type Alert {
    id: ID!
    organizationId: ID!
    ruleId: ID!
    message: String!
    severity: String!
    triggeredAt: DateTime!
    resolvedAt: DateTime
  }

  type AlertRule {
    id: ID!
    organizationId: ID!
    name: String!
    metric: String!
    condition: String!
    threshold: Float!
    isActive: Boolean!
    notifyChannels: [String!]!
    createdAt: DateTime!
  }

  type ROIData {
    organizationId: ID!
    totalRevenue: Float!
    totalCost: Float!
    overallROI: Float!
    conversionRate: Float!
    averageOrderValue: Float!
  }

  type ROIForecast {
    contentId: ID!
    projectedRevenue: Float!
    confidence: Float!
    days: Int!
    projectedAt: DateTime!
  }

  type WebhookSubscription {
    id: ID!
    organizationId: ID!
    url: String!
    events: [String!]!
    isActive: Boolean!
    createdAt: DateTime!
    lastTriggeredAt: DateTime
  }

  type WebhookEvent {
    id: ID!
    organizationId: ID!
    eventType: String!
    resourceType: String!
    resourceId: ID!
    payload: JSON!
    timestamp: DateTime!
    deliveredAt: DateTime
  }

  type Organization {
    id: ID!
    name: String!
    status: String!
    createdAt: DateTime!
    contentCount: Int!
    templateCount: Int!
    webhookCount: Int!
  }

  type PublishResult {
    id: ID!
    contentId: ID!
    platform: String!
    status: String!
    publishedAt: DateTime!
    url: String
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    uptime: Int!
    database: String!
    modules: [ModuleStatus!]!
  }

  type ModuleStatus {
    name: String!
    status: String!
    version: String!
  }

  # Inputs
  input CreateContentInput {
    organizationId: ID!
    title: String!
    body: String!
    tags: [String!]
    contentType: String
  }

  input UpdateContentInput {
    title: String
    body: String
    tags: [String!]
    status: ContentStatus
  }

  input CreateTemplateInput {
    organizationId: ID!
    name: String!
    description: String
    category: String!
    titleTemplate: String!
    bodyTemplate: String!
    tags: [String!]
    metadata: JSON
    isPublic: Boolean
  }

  input UpdateTemplateInput {
    name: String
    description: String
    titleTemplate: String
    bodyTemplate: String
    tags: [String!]
  }

  input CreateMetricInput {
    organizationId: ID!
    name: String!
    description: String
    formula: String
    unit: String
    targetValue: Float
    currentValue: Float!
  }

  input UpdateMetricInput {
    name: String
    description: String
    formula: String
    unit: String
    targetValue: Float
    currentValue: Float
  }

  input AddCommentInput {
    contentId: ID!
    organizationId: ID!
    text: String!
    mentions: [String!]
  }

  input CreateApprovalInput {
    organizationId: ID!
    contentId: ID!
    steps: [ApprovalStepInput!]!
  }

  input ApprovalStepInput {
    role: String!
    priority: String!
  }

  input CreateAlertInput {
    organizationId: ID!
    name: String!
    metric: String!
    condition: String!
    threshold: Float!
    notifyChannels: [String!]
  }

  input TriggerAlertInput {
    organizationId: ID!
    ruleId: ID!
    message: String!
    severity: String
  }

  input SubscribeWebhookInput {
    organizationId: ID!
    url: String!
    events: [String!]!
  }

  input TriggerWebhookInput {
    organizationId: ID!
    eventType: String!
    resourceType: String!
    resourceId: ID!
    data: JSON
  }

  input CreateVersionInput {
    organizationId: ID!
    contentId: ID!
    title: String!
    body: String!
    tags: [String!]
    changeMessage: String
  }

  # Payloads
  type ContentPayload {
    success: Boolean!
    data: Content
    errors: [String!]
  }

  type TemplatePayload {
    success: Boolean!
    data: ContentTemplate
    errors: [String!]
  }

  type MetricPayload {
    success: Boolean!
    data: CustomMetric
    errors: [String!]
  }

  type MetricReadingPayload {
    success: Boolean!
    data: MetricReading
    errors: [String!]
  }

  type CommentPayload {
    success: Boolean!
    data: Comment
    errors: [String!]
  }

  type ApprovalPayload {
    success: Boolean!
    data: ApprovalTask
    errors: [String!]
  }

  type AlertPayload {
    success: Boolean!
    data: Alert
    errors: [String!]
  }

  type WebhookPayload {
    success: Boolean!
    data: WebhookSubscription
    errors: [String!]
  }

  type WebhookEventPayload {
    success: Boolean!
    data: WebhookEvent
    errors: [String!]
  }

  type VersionPayload {
    success: Boolean!
    data: ContentVersion
    errors: [String!]
  }

  type DeletePayload {
    success: Boolean!
    message: String
  }

  type PublishPayload {
    success: Boolean!
    results: [PublishResult!]!
    errors: [String!]
  }

  scalar DateTime
  scalar JSON
`;
