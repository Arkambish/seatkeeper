import "server-only";
import { cache } from "react";
import { dehydrate } from "@tanstack/react-query";
import { makeQueryClient } from "./client";

/** Request-scoped QueryClient for Server Component prefetching. */
export const getServerQueryClient = cache(makeQueryClient);

export const dehydrateServer = () => dehydrate(getServerQueryClient());
