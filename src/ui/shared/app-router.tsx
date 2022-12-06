import {ReactNode, ComponentType} from "react";
import {createContext, useCallback, useContext, useEffect, useMemo} from "react";
import {useRerender} from "../../util/use-rerender";

// sort of a stripped down, barebones react router clone

interface HistoryState {
	crumb: string[];
}

function useHistory() {
	const routes = useMemo(() => new Set<() => void>(), []);
	const rerender = useCallback(() => routes.forEach((r) => r()), []);
	if (history.state == null) {
		history.replaceState({crumb: ["/"]}, "", "/");
	}

	useEffect(() => {
		window.onpopstate = rerender;
	}, []);

	const go = (route: string) => {
		const historyState = history.state as HistoryState;
		const crumb = historyState.crumb;
		const index = crumb.indexOf(route);
		if (index >= 0) {
			history.go(index - crumb.length);
		} else {
			history.pushState({crumb: historyState.crumb.concat(route)}, "", "/");
		}

		rerender();
	};

	const back = () => {
		history.back();
		rerender();
	};

	const home = () => {
		const historyState = history.state as HistoryState;
		history.go(-(historyState.crumb.length - 1));
		rerender();
	};

	return useMemo(() => ({
		useRoute: (route: () => void) => useEffect(() => {
			routes.add(route);
			return () => {routes.delete(route);};
		}, []),
		methods: {go, back, home},
	}), []);
}

const routerContext = createContext<ReturnType<typeof useHistory> | null>(null);

export function AppRouter({children}: {children: ReactNode}) {
	const context = useHistory();

	return (
		<routerContext.Provider value={context}>
			{children}
		</routerContext.Provider>
	);
}

export function Route({path, exact, Component}: {path: string; exact?: boolean; Component: ComponentType}) {
	useContext(routerContext)!.useRoute(useRerender());
	const historyState = history.state as HistoryState;
	const crumb = historyState.crumb;
	const urlPath = new URL(crumb[crumb.length - 1], location.href).pathname;
	const defPath = new URL(path, location.href).pathname;

	if (exact ?? false) {
		if (defPath !== urlPath) {
			return null;
		}
	} else {
		const defParts = defPath.split("/");
		const urlParts = urlPath.split("/");

		for (let i = 0; i < defParts.length; i++) {
			if (defParts[i] !== urlParts[i]) {
				return null;
			}
		}
	}

	return <Component />;
}

export function useRouter() {
	return useContext(routerContext)!.methods;
}
