import {createContext, useCallback, useContext, useEffect, useMemo} from "react";
import {useRerender} from "../../util/use-rerender";

// sort of a stripped down, barebones react router clone

function useHistory() {
	const routes = useMemo(() => new Set(), []);

	const rerender = useCallback(() => routes.forEach((r) => r()), []);

	useEffect(() => {
		if (history.state == null) {
			history.replaceState({crumb: ["/"]}, null, "/");
		}

		window.onpopstate = rerender;
	}, []);

	const go = (route) => {
		const crumb = history.state.crumb;
		const index = crumb.indexOf(route);
		if (index >= 0) {
			history.go(index - crumb.length);
		} else {
			history.pushState({crumb: history.state.crumb.concat(route)}, null, "/");
		}

		rerender();
	};

	const back = () => {
		history.back();
		rerender();
	};

	const home = () => {
		history.go(-(history.state.crumb.length - 1));
		rerender();
	};

	return useMemo(() => ({
		useRoute: (route) => useEffect(() => {
			routes.add(route);
			return () => routes.delete(route);
		}, []),
		methods: {go, back, home},
	}), []);
}

const routerContext = createContext();

export function AppRouter({children}) {
	const context = useHistory();

	return (
		<routerContext.Provider value={context}>
			{children}
		</routerContext.Provider>
	);
}

export function Route({path, exact, Component}) {
	useContext(routerContext).useRoute(useRerender());
	const crumb = history.state.crumb;
	const urlPath = new URL(crumb[crumb.length - 1], location).pathname;
	const defPath = new URL(path, location).pathname;

	if (exact) {
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
	return useContext(routerContext).methods;
}
