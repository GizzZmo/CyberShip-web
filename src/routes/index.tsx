import { createFileRoute } from "@tanstack/react-router";
import { CyberShip } from "@/components/CyberShip";

export const Route = createFileRoute("/")({ component: CyberShip });
