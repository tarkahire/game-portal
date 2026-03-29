# AI System

## Overview

The AI controls the red car in "vs AI" mode and operates on a decision-update loop. Decisions are made at intervals determined by the difficulty's `reactionDelay`, creating visible "thinking" lag for easier difficulties. In 2-player mode, the AI is not used -- the red car is controlled by Player 2 via a second PlayerCar instance.

## Difficulty Parameters

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Reaction Delay | 500ms | 200ms | 50ms |
| Max Speed | 200 px/s | 300 px/s | 400 px/s |
| Prediction | No | No | Yes |
| Jump Accuracy | 25% | 60% | 90% |
| Positioning Skill | 0.3 | 0.6 | 0.95 |
| Mistake Chance | 15% | 5% | 1% |

## Behavioural States

### DEFEND
Triggers when the ball is on the AI's side and moving toward its goal. The AI positions itself between the ball and its own goal. Higher `positioningSkill` means better interception angles.

### ATTACK
Triggers when the ball is on the AI's side but not threatening the goal. The AI chases the ball and tries to push it left toward the opponent's goal by approaching from the right side.

### RETREAT
Triggers when the ball is on the opponent's side. Better AI pushes up to midfield (60% of pitch width); weaker AI stays back defensively (75% of pitch width).

## Jump Logic

The AI considers jumping when:
- The ball is within 100px horizontally
- The ball is above ground level (80px+ above floor, adjusted by map wall thickness)
- A random roll succeeds against `jumpAccuracy`

## Mistake Mechanic

On each decision update, there's a probability (based on `mistakeChance`) that the AI picks a random target position instead of the optimal one. This creates human-like errors.

## Prediction (Hard Only)

Hard AI predicts where the ball will be in 0.4 seconds, accounting for velocity and gravity. It moves toward the predicted position rather than the current position, making it significantly better at intercepting.

## Map Awareness

The AICar constructor receives `wallThickness` from the current map config. This value is used to calculate correct goal and ground positions relative to the map's pitch boundaries, so the AI adapts to different map sizes (e.g. wider Colosseum pitch vs compact Arena).

## Speed Cap

When a car speed preset is applied, the AI's max velocity is capped at the lower of the speed preset's maxSpeed or the AI difficulty's own maxSpeed. This prevents the AI from exceeding its difficulty-appropriate speed even on "Fast" or "Very Fast" presets.

## Limitations

The AI does not use boost or air rotation. It only moves horizontally and jumps. It does not intentionally avoid obstacles on maps like Fortress or Chaos.

## Tuning

All AI parameters are in `src/config/gameConfig.js` under the `AI` object. Adjust these values to rebalance difficulty levels.
