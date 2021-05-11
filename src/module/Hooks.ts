import { warn, error, debug, i18n, i18nFormat, log } from "../combatdetails";
import { AssignXP, AssignXPApp } from "./assignxp";
import { CombatDetails, combatposition, volume } from "./combatdetailsimpl";
import { ContestedRoll } from "./contestedroll";
import { MODULE_NAME } from './settings';
import { TokenBar } from "./tokenbar";
//@ts-ignore
// import { KeybindLib } from "/modules/keybind-lib/keybind-lib.js";

// const previewer = new SoundPreviewerApplication();

export let readyHooks = async () => {

  // setup all the hooks

  // ==========================================
  // Combat Details Impl
  // ==========================================

  //@ts-ignore
  libWrapper.register(MODULE_NAME, 'Token.prototype._canDrag', CombatDetails.combatDetailsTokenPrototypeCanDragHandler, 'MIXED');

  /**
   * Handle combatant update
   */
  Hooks.on("updateCombatant", function (context, parentId, data) {
    const combat = game.combats.get(parentId);
    if (combat) {
      const combatant = combat.data.combatants.find((o:Combat) => o.id === data.id);

      if (combatant.actor.owner) CombatDetails.checkCombatTurn();
    }
  });

  /**
   * Handle combatant delete
   */
  Hooks.on("deleteCombatant", function (context, parentId, data) {
    let combat = game.combats.get(parentId);
    CombatDetails.checkCombatTurn();
  });

  /**
   * Handle combatant added
   */
  Hooks.on("addCombatant", function (context, parentId, data) {
    let combat = game.combats.get(parentId);
    let combatant = combat.data.combatants.find((o:Combat) => o.id === data.id);

    if (combatant.actor.owner)
      CombatDetails.checkCombatTurn();
  });

  /**
   * Combat update hook
   */

  Hooks.on("deleteCombat", function (combat) {
      CombatDetails.tracker = false;   //if the combat gets deleted, make sure to clear this out so that the next time the combat popout gets rendered it repositions the dialog

      //set movement to free movement
      CombatDetails.tokenbar.changeGlobalMovement("free");

      new AssignXPApp(combat, undefined).render(true);

      if (game.combats.combats.length == 0 && game.settings.get(MODULE_NAME, 'close-combat-when-done')) {
          const tabApp = ui["combat"];
          tabApp.close();
      }

  });

  Hooks.on("updateCombat", function (data, delta) {
      CombatDetails.checkCombatTurn();

      $(CombatDetails.tokenbar.tokens).each(function () {
          this.token.unsetFlag(MODULE_NAME, "nofified");
      });

    log("update combat", data);
    if(game.settings.get(MODULE_NAME, "opencombat") && delta.round === 1 && data.turn === 0 && data.started === true){
      //new combat, pop it out
      const tabApp = ui["combat"];
      tabApp.renderPopout();

          if (ui.sidebar.activeTab !== "chat")
              ui.sidebar.activateTab("chat");

          //set movement to combat only
          CombatDetails.tokenbar.changeGlobalMovement("combat");
      }

      if (combatposition() !== '' && delta.active === true) {
          //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
          CombatDetails.tracker = false;   //delete this so that the next render will reposition the popout, changin between combats changes the height
      }

    if (!game.user.isGM && Object.keys(delta).some((k) => k === "round")) {
      AudioHelper.play({src: CombatDetails.ROUND_SOUND, volume: volume(), autoplay: false, loop: false}, true);
    }
  });

  /**
   * Ready hook
   */
  Hooks.on("ready", CombatDetails.ready);

  Hooks.on('renderCombatTracker', async (app, html, options) => {
    if(!CombatDetails.tracker && app.options.id == "combat-popout"){
      CombatDetails.tracker = true;

      if(combatposition() !== ''){
          CombatDetails.repositionCombat(app);
      }
    }
  });

  Hooks.on('closeCombatTracker', async (app, html) => {
    CombatDetails.tracker = false;
  });

  Hooks.on('renderTokenHUD', async (app, html, options) => {
      CombatDetails.element = html;
      CombatDetails.tokenHUD = app;
      $('.col.left .control-icon.target', html).insertBefore($('#token-hud .col.left .control-icon.config'));
  });

  Hooks.on('renderCombatTracker', async (app, html, options) => {
      if (game.user.isGM && game.combat && !game.combat.started && game.settings.get(MODULE_NAME, 'show-combat-cr')) {
          //calculate CR
          let data = CombatDetails.getCR(game.combat);

          if ($('#combat-round .encounter-cr-row').length == 0 && game.combat.data.combatants.length > 0) {
              $('<nav>').addClass('encounters flexrow encounter-cr-row')
                  .append($('<h3>').html('CR: ' + CombatDetails.getCRText(data.cr)))
                  .append($('<div>').addClass('encounter-cr').attr('rating', CombatDetails.getCRChallenge(data)).html(CombatDetails.getCRChallengeName(data)))
                  .insertAfter($('#combat-round .encounters:last'));
          }
      }

      if (game.combat == undefined) {
          $('#combat-round h3', html).css({ fontSize: '16px', lineHeight: '15px'});
      }

      if (!game.user.isGM && game.combat && game.combat.started) {
          $('.combat-control[data-control="previousTurn"],.combat-control[data-control="nextTurn"]:last').css({visibility:'hidden'});
      }
  });

  Hooks.on('renderChatLog', (app, html, options) => {
      if (game.user.isGM) {
          $('<a>').addClass('button confetti').html('🎉').insertAfter($('#chat-controls .chat-control-icon', html)).on('click', function () {
              if (window['confetti']) {
                  const shootConfettiProps = window['confetti'].getShootConfettiProps(2);
                  window['confetti'].shootConfetti(shootConfettiProps);
              }
          });
          $('.confetti-buttons', html).hide();
      }
  });

  Hooks.on('renderSceneConfig', async (app, html, options) => {
    if (game.settings.get(MODULE_NAME, 'scene-palette')) {
        CombatDetails.currentScene = app.object;

        if (CombatDetails.currentScene.img != undefined) {
            let backgroundColor = $('input[name="backgroundColor"]').parents('.form-group:first');

            $('<div>')
                .addClass('form-group')
                .append($('<label>').html('Background Palette'))
                .append($('<div>').addClass('form-fields palette-fields'))
                .insertAfter(backgroundColor);

            CombatDetails.getPalette(CombatDetails.currentScene.img);
            //get dimensions
            loadTexture(CombatDetails.currentScene.img).then((bg:any) => {
                if (bg != undefined) {
                    $('.background-size.width').html(bg.width);
                    $('.background-size.height').html(bg.height);
                }
            });
        }

        $('<div>')
            .addClass('background-size width')
            .insertAfter($('input[name="width"]'));
        $('<div>')
            .addClass('background-size height')
            .insertAfter($('input[name="height"]'));

        $('input.image[name="img"]').on('change', function () {
            let img = String($(this).val());
            CombatDetails.getPalette(img);
            loadTexture(img).then((bg:any) => {
                if (bg != undefined) {
                    $('.background-size.width').html(bg.width);
                    $('.background-size.height').html(bg.height);
                }
            });
        })
    }
  });

  // ==========================================
  // Contested Roll
  // ==========================================

  Hooks.on('controlToken', (token, delta) => {
    if (game.user.isGM && delta === true && CombatDetails.tokenbar.contestedroll != undefined && CombatDetails.tokenbar.contestedroll._state != -1) {
        if (CombatDetails.tokenbar.contestedroll.token == undefined)
            CombatDetails.tokenbar.contestedroll.token = token;
        else if (CombatDetails.tokenbar.contestedroll.countertoken == undefined)
            CombatDetails.tokenbar.contestedroll.countertoken = token;
        CombatDetails.tokenbar.contestedroll.render(true);
    }
  });

  Hooks.on("renderChatMessage", (message, html, data) => {
    const svgCard = html.find(".combatdetail-message.contested-roll");
    if (svgCard.length !== 0) {

        if (!game.user.isGM)
            html.find(".gm-only").remove();
        if (game.user.isGM)
            html.find(".player-only").remove();

        let dc = message.getFlag(MODULE_NAME, 'dc');
        let mode = message.getFlag(MODULE_NAME, 'mode');

        $('.roll-all', html).click($.proxy(ContestedRoll.onRollAll, ContestedRoll, message));

        let actors = <any[]>message.getFlag(MODULE_NAME, 'actors');
        let actorRolling = (actors[0].rolling || actors[1].rolling);

        let items = $('.item', html);
        for (let i = 0; i < items.length; i++) {
            var item = items[i];
            let actorId = $(item).attr('data-item-id');
            let actorData = actors.find(a => { return a.id == actorId; });
            let actor = game.actors.get(actorId);

            $(item).toggle(game.user.isGM || mode == 'roll' || mode == 'gmroll' || (mode == 'blindroll' && actor.owner));

            if (game.user.isGM || actor.owner)
                $('.item-image', item).on('click', $.proxy(ContestedRoll._onClickToken, this, actorData.tokenid))
            $('.item-roll', item).toggle(actorData.roll == undefined && (game.user.isGM || (actor.owner && mode != 'selfroll'))).click($.proxy(ContestedRoll.onRollAbility, this, actorId, message, false));
            $('.dice-total', item).toggle(actorData.roll != undefined && (game.user.isGM || mode == 'roll' || (actor.owner && mode != 'selfroll')));


            if (actorData.roll != undefined) {
                let roll = Roll.fromData(actorData.roll);
                let showroll = game.user.isGM || mode == 'roll' || (mode == 'gmroll' && actor.owner);
                $('.dice-result', item).toggle(showroll || (mode == 'blindroll' && actor.owner));
                if (actorData.rolling || (mode == 'blindroll' && !game.user.isGM))
                    $('.dice-result', item).html(actorData.rolling ? '...' : '-');
                if (actorData.rolling && game.user.isGM)
                    $('.dice-result', item).on('click', $.proxy(ContestedRoll.finishRolling, ContestedRoll, actorId, message));
                //if (showroll && !actorData.rolling && $('.dice-tooltip', item).is(':empty')) {
                //    let tooltip = await roll.getTooltip();
                //    $('.dice-tooltip', item).empty().append(tooltip);
                //}
                if(game.user.isGM)
                    $('.roll-result', item).click($.proxy(ContestedRoll.setRollSuccess, this, actorId, message, true));

                $('.roll-result', item).toggleClass('result-passed selected', actorData.passed == 'won' && !actorRolling)
                $('.roll-result i', item)
                    .toggleClass('fa-check', actorData.passed == 'won' && !actorRolling && (game.user.isGM || mode != 'blindroll'))
                    //.toggleClass('fa-check', actorData.passed == 'failed')
                    .toggleClass('fa-minus', actorData.passed == 'tied' && !actorRolling && (game.user.isGM || mode != 'blindroll'))
                    .toggleClass('fa-ellipsis-h', (actorData.passed == 'waiting' || actorRolling) && actorData.roll != undefined && (game.user.isGM || mode != 'blindroll'));
            }

            //if there hasn't been a roll, then show the button if this is the GM or if this token is controlled by the current user

            //if this is the GM, and there's a roll, show the pass/fail buttons
            //highlight a button if the token hasn't had a result selected
            //toggle the button, if a result has been selected

            //if this is not the GM, and the results should be shown, and a result has been selected, then show the result
        };
    }
  });

  // ==========================================
  // Assing XP
  // ==========================================

  Hooks.on("renderChatMessage", (message, html, data) => {
    const assignCard = html.find(".combatdetail-message.assignxp");
      if (assignCard.length !== 0) {
          if (!game.user.isGM)
              html.find(".gm-only").remove();
          if (game.user.isGM)
              html.find(".player-only").remove();

          $('.assign-all', html).click($.proxy(AssignXP.onAssignAllXP, AssignXP, message));

          let actors = <any[]>message.getFlag(MODULE_NAME, 'actors');

          let items = $('.item', html);
          for (let i = 0; i < items.length; i++) {
              var item = items[i];
              let actorId = $(item).attr('data-item-id');
              let actorData = actors.find(a => { return a.id == actorId; });
              let actor = game.actors.get(actorId);

              let assign = !actorData.assigned && (game.user.isGM || actor.owner);
              $('.dice-total', item).toggleClass('assigned', !assign);
              $('.add-xp', item).toggle(assign).click($.proxy(AssignXP.onAssignXP, this, actorId, message));
          }
      }
  });

  // =============================================
  // Token Bar
  // =============================================

  Hooks.on('renderTokenBar', (app, html) => {
    CombatDetails.tokenbar.setPos().show();
    //CombatDetails.tokenbar._getTokensByScene();
    let gMovement = game.settings.get(MODULE_NAME, "movement");
    $('.token-movement[data-movement="' + gMovement + '"]', html).addClass('active');
    $('.token-movement[data-movement="combat"]', html).toggleClass('disabled', game.combats.active?.started !== true);
    $(app.tokens).each(function () {
        let tMovement = this.token.getFlag(MODULE_NAME, "movement");
        if (tMovement != undefined && tMovement != gMovement) {
            $('.token[data-token-id="' + this.id + '"] .movement-icon', html).attr('movement', tMovement);
        }
    });
  });

  Hooks.on("ready", () => {
      if (game.user.isGM && game.settings.get(MODULE_NAME, "show-token-bar")) {
          CombatDetails.tokenbar = new TokenBar(undefined);
          CombatDetails.tokenbar._getTokensByScene();
          CombatDetails.tokenbar.render(true);
      }
  });


  Hooks.on('canvasReady', () => {
      //CombatDetails.tokenbar._getTokensByScene();
      //$('.token-action-bar .token-list', CombatDetails.tokenbar.element).empty();
      if (game.user.isGM && CombatDetails.tokenbar != undefined) {
          CombatDetails.tokenbar._getTokensByScene();
          CombatDetails.tokenbar.render(true);
      }
  });

  Hooks.on("createToken", (token) => {
      if (game.user.isGM && CombatDetails.tokenbar != undefined) {
          CombatDetails.tokenbar._getTokensByScene();
          CombatDetails.tokenbar.render(true);
      }
  });

  Hooks.on("deleteToken", (token) => {
      if (game.user.isGM && CombatDetails.tokenbar != undefined) {
          CombatDetails.tokenbar._getTokensByScene();
          CombatDetails.tokenbar.render(true);
      }
  });

  // Register custom sheets (if any)

}

export let setupHooks = () => {

}



export let initHooks = () => {
  warn("Init Hooks processing");

  CombatDetails.init();
}

