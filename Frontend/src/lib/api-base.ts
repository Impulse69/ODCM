export function getApiBase() {
	const configuredBase = process.env.NEXT_PUBLIC_API_URL ?? "";

	if (process.env.NODE_ENV === "development") {
		return configuredBase;
	}

	if (!configuredBase) {
		return "";
	}

	if (configuredBase.includes("localhost") || configuredBase.includes("127.0.0.1")) {
		return "";
	}

	return configuredBase;
}