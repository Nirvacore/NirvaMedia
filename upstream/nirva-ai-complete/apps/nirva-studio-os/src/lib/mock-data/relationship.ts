import type { Edge, Node } from "@xyflow/react";
import type { RelationNodeData } from "@/types";

export const mockRelationshipNodes: Node<RelationNodeData>[] = [
  {
    id: "n_best",
    position: { x: 400, y: 220 },
    data: {
      label: "BEST Investigation Co., Ltd.",
      kind: "company",
      detail: "Core operating company — investigation & facility services.",
      meta: [
        { label: "Registered", value: "2018" },
        { label: "Team", value: "12 people" },
        { label: "Active projects", value: "3" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_founder",
    position: { x: 80, y: 60 },
    data: {
      label: "Founder / Owner",
      kind: "person",
      detail: "Owns and manages the company; primary decision maker.",
      meta: [
        { label: "Role", value: "CEO" },
        { label: "Focus", value: "Growth + AI ops" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_customer",
    position: { x: 760, y: 60 },
    data: {
      label: "Customer Site A",
      kind: "customer",
      detail: "Office complex — monthly cleaning service contract.",
      meta: [
        { label: "Since", value: "2023" },
        { label: "Value", value: "฿86,000 / mo" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_supplier",
    position: { x: 60, y: 380 },
    data: {
      label: "Supplier A",
      kind: "supplier",
      detail: "Cleaning equipment and consumables supplier.",
      meta: [
        { label: "Terms", value: "Net 30" },
        { label: "Rating", value: "4.6 / 5" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_contract",
    position: { x: 760, y: 260 },
    data: {
      label: "Contract Document",
      kind: "document",
      detail: "Service agreement — Site A, renews every 12 months.",
      meta: [
        { label: "Renewal", value: "Nov 2026" },
        { label: "Status", value: "Active" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_project",
    position: { x: 420, y: 440 },
    data: {
      label: "Cleaning Service Project",
      kind: "project",
      detail: "Recurring operations project for Customer Site A.",
      meta: [
        { label: "Crew", value: "4" },
        { label: "Schedule", value: "Mon–Sat" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_campaign",
    position: { x: 120, y: 600 },
    data: {
      label: "Marketing Campaign",
      kind: "content",
      detail: "Local-services campaign generated from project results.",
      meta: [
        { label: "Channel", value: "Facebook" },
        { label: "Stage", value: "Planning" },
      ],
    },
    type: "nirva",
  },
  {
    id: "n_post",
    position: { x: 460, y: 660 },
    data: {
      label: "Facebook Post",
      kind: "content",
      detail: "Before/after story post — drafted from the campaign.",
      meta: [{ label: "Status", value: "Draft" }],
    },
    type: "nirva",
  },
  {
    id: "n_voice",
    position: { x: 780, y: 600 },
    data: {
      label: "Voice Note",
      kind: "capture",
      detail: "Founder's voice note about expanding Site A services.",
      meta: [{ label: "Length", value: "1:12" }],
    },
    type: "nirva",
  },
  {
    id: "n_task",
    position: { x: 800, y: 440 },
    data: {
      label: "Task: Draft FB post",
      kind: "task",
      detail: "Draft Facebook post from voice note — due this week.",
      meta: [{ label: "Assignee", value: "Founder" }],
    },
    type: "nirva",
  },
];

export const mockRelationshipEdges: Edge[] = [
  { id: "e1", source: "n_founder", target: "n_best", label: "owns" },
  { id: "e2", source: "n_founder", target: "n_project", label: "manages" },
  { id: "e3", source: "n_customer", target: "n_best", label: "customer_of" },
  { id: "e4", source: "n_supplier", target: "n_best", label: "supplier_of" },
  { id: "e5", source: "n_best", target: "n_contract", label: "has_contract" },
  { id: "e6", source: "n_project", target: "n_campaign", label: "generates_content" },
  { id: "e7", source: "n_campaign", target: "n_post", label: "generates_content" },
  { id: "e8", source: "n_voice", target: "n_task", label: "creates_task" },
  { id: "e9", source: "n_contract", target: "n_project", label: "related_to" },
  { id: "e10", source: "n_task", target: "n_post", label: "related_to" },
];
