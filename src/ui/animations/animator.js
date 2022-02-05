import {useCallback, useMemo} from "react";
import {useSizes} from "../shared/sizerator";

export function useAnimator() {
	const animData = useMemo(() => ({}), []);
	const sizes = useSizes();
	animData.animate = useCallback((time) => {
		const delta = time - (animData.prevTime ?? time);
		animData.prevTime = time;
		animData.animation.advance(delta / 1000, sizes);
		animData.frame = requestAnimationFrame(animData.animate);
	}, [sizes]);

	const setAnimation = useCallback((animation) => {
		cancelAnimationFrame(animData.frame);
		animData.animation = animation;
		animData.prevTime = null;
		if (animation != null) {
			animData.frame = requestAnimationFrame(animData.animate);
		}
	}, []);

	return [animData.animation != null, setAnimation];
}
