import type { BuildProfile } from '../../capabilities/construction/build-effect';
import { nativeWorkProfile } from './work-profile';
export function nativeBuildProfile(body: readonly BodyPartDefinition[]): BuildProfile {
  return nativeWorkProfile(body,'build',5);
}
