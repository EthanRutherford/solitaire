import {useCallback, useEffect, useMemo} from "react";
import {useSizes} from "../shared/sizerator";

export interface Animation {
	advance: (delta: number, sizes: ReturnType<typeof useSizes>) => void,
}

interface AnimationData {
	animate: (time: number) => void,
	prevTime?: number|null,
	animation?: Animation|null,
	frame?: number,
}

export function useAnimator() {
	const sizes = useSizes();
	const animData = useMemo((): AnimationData => {
		return {
			animate(time: number) {
				const delta = time - (animData.prevTime ?? time);
				animData.prevTime = time;
				animData.animation?.advance(delta / 1000, sizes);
				animData.frame = requestAnimationFrame(animData.animate);
			},
		};
	}, [sizes]);

	useEffect(() => () => {
		cancelAnimationFrame(animData.frame!);
	}, []);

	const setAnimation = useCallback((animation: Animation|null) => {
		cancelAnimationFrame(animData.frame!);
		animData.animation = animation;
		animData.prevTime = null;
		if (animation != null) {
			animData.frame = requestAnimationFrame(animData.animate);
		}
	}, []);

	return [animData.animation != null, setAnimation] as const;
}
