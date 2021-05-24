interface ModuleDefinition {
	exported: object,
	state: "loading" | "done",
}

interface QueueItem {
	qualifiedModuleName: string,
	qualifiedStaticDependencies: string[],
	definingSrc: string | undefined,
	f: (...args: any[]) => any,
}

var define = (function () {
	function debug(...everything: any[]) {
		//console.info("minirequire:", ...everything);
	}

	const loadedModules: Record<string, ModuleDefinition> = {};
	const queue: QueueItem[] = [];

	const SPECIAL: Record<string, (x: { exported: any, requestingModuleID: string }) => any> = {
		"$minirequire"() {
			return {
				queue,
				loadedModules,
			};
		},
		"exports"({ exported }: { exported: any }) {
			return exported;
		},
		"require"({ requestingModuleID }: { requestingModuleID: string }) {
			return (request: string) => {
				throw new Error("minirequire: dynamic call `require("
					+ JSON.stringify(request)
					+ ")` from `"
					+ requestingModuleID
					+ "` is not implemented.");
			};
		},
	};

	function attemptItem(item: QueueItem): "successful" | "unsatisfied" {
		debug("attempting", item.qualifiedModuleName);
		const exported = {};
		const resolved = [];
		for (const dependency of item.qualifiedStaticDependencies) {
			const special = SPECIAL[dependency];
			if (special !== undefined) {
				resolved.push(special({
					exported,
					requestingModuleID: item.qualifiedModuleName,
				}));
			} else {
				const module = loadedModules[dependency];
				if (module === undefined) {
					debug(item.qualifiedModuleName, "requires", dependency, "which is not yet satisfied.");
					return "unsatisfied";
				}
				resolved.push(module.exported);
			}
		}

		loadedModules[item.qualifiedModuleName] = {
			exported,
			state: "loading",
		};
		debug("loading", item.qualifiedModuleName);
		const result = item.f(...resolved);
		if (result !== undefined) {
			throw new Error("unexpected return from `" + item.definingSrc + ":" + item.qualifiedModuleName + "`.");
		}
		loadedModules[item.qualifiedModuleName].state = "done";
		debug("successful", item.qualifiedModuleName);
		debug("loadedModules:", loadedModules);
		debug("queue:", queue);
		return "successful";
	}

	function drainQueue() {
		while (queue.length !== 0) {
			let progress = false;
			for (let i = 0; i < queue.length; i++) {
				const item = queue[i];
				const attempt = attemptItem(item);
				if (attempt === "successful") {
					queue[i] = queue[queue.length - 1];
					queue.pop();
					progress = true;
				}
			}

			if (!progress) {
				return;
			}
		}
	}

	return function define(
		...props: [
			unqualifiedModuleName: string,
			unqualifiedDependencies: string[],
			f: (...args: any[]) => any,
		] | [
			unqualifiedDependencies: string[],
			f: (...args: any[]) => any,
		]
	) {
		const script = document.currentScript as (HTMLScriptElement | undefined);

		let unqualifiedModuleName: string;
		let unqualifiedDependencies: string[];
		let f: (...args: any[]) => any;
		if (props.length === 3) {
			[unqualifiedModuleName, unqualifiedDependencies, f] = props;
		} else {
			unqualifiedModuleName = (script && script.src) || (Math.random() + "");
			unqualifiedDependencies = props[0];
			f = props[1];
		}

		// TODO: Module ID rewriting rules.
		const qualifiedModuleName = unqualifiedModuleName;

		const qualifiedDependencies = [];
		for (const unqualifiedDependency of unqualifiedDependencies) {
			if (unqualifiedDependency in SPECIAL) {
				qualifiedDependencies.push(unqualifiedDependency);
			} else {
				// TODO: Dependency module ID rewriting rules.
				const qualified = unqualifiedDependency;
				qualifiedDependencies.push(qualified);
			}
		}

		queue.push({
			qualifiedModuleName,
			qualifiedStaticDependencies: qualifiedDependencies,
			definingSrc: script && script.src,
			f,
		});

		debug("grew queue to", queue);
		drainQueue();
	}
})();
(define as any).amd = true;
