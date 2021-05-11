
export const MODULE_NAME = "combatdetails";

/**
 * Because typescript doesn't know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it's typed as declare let canvas: Canvas | {ready: false}.
 * That's why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because no canvas mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
 export function getCanvas(): Canvas {
	if (!(canvas instanceof Canvas) || !canvas.ready) {
		throw new Error("Canvas Is Not Initialized");
	}
	return canvas;
}

export const registerSettings = function () {
  // Register any custom module settings here

	let dialogpositions = {
		'': '—',
		'topleft': 'Top Left',
		'topright': 'Top Right',
		'bottomleft': 'Bottom Left',
		'bottomright': 'Bottom Right'
	  };

	game.settings.register(MODULE_NAME, "shownextup", {
		name: game.i18n.localize("CombatDetails.ShowNextUp"),
		hint: game.i18n.localize("CombatDetails.ShowNextUpHint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "showcurrentup", {
		name: game.i18n.localize("CombatDetails.ShowCurrentUp"),
		hint: game.i18n.localize("CombatDetails.ShowCurrentUpHint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "volume", {
		name: game.i18n.localize("CombatDetails.Volume"),
		hint: game.i18n.localize("CombatDetails.VolumeHint"),
		scope: "client",
		config: true,
		range: {
			min: 0,
			max: 100,
			step: 10,
		},
		default: 60,
		type: Number,
	});
	game.settings.register(MODULE_NAME, "combat-position", {
        name: game.i18n.localize("CombatDetails.Position"),
        hint: game.i18n.localize("CombatDetails.PositionHint"),
        scope: "world",
        default: null,
        type: String,
        choices: dialogpositions,
        config: true
    });
	game.settings.register(MODULE_NAME, "opencombat", {
		name: game.i18n.localize("CombatDetails.PopoutCombat"),
		hint: game.i18n.localize("CombatDetails.PopoutCombatHint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "close-combat-when-done", {
		name: "Close Combat when done",
		hint: "Close the combat popout, when you've done a combat encounter, if there are no other combats active.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "show-combat-cr", {
		name: "Show Encounter CR",
		hint: "When creating a combat encounter, display the estimated CR for that encounter.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "notify-on-change", {
		name: "Notify on Movement Change",
		hint: "Send a notification to all players when the GM changes the allowable movement",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	/*game.settings.register(MODULE_NAME, "allow-previous-move", {
		name: "Allow Previous Turn Move",
		hint: "During a combat round, allow the previous turn to move.  Sometimes it allows combat to flow quicker if you can trust the previous player to clean up their movement while you move on to the next player.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});*/
	game.settings.register(MODULE_NAME, "alter-hud", {
		name: "Alter the Token HUD status effects",
		hint: "Alter the Token HUD to show detailed status effects and allow to clear all effects.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "scene-palette", {
		name: "Show Scene Palette",
		hint: "Show the top 5 dominant colours of a scene just in case you want to set the background colour to a similar colour.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(MODULE_NAME, "show-token-bar", {
		name: "Show Token Bar",
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	//this is just a global setting for movement mode
	game.settings.register(MODULE_NAME, "movement", {
		scope: "world",
		config: false,
		default: "free",
		type: String,
	});
};
