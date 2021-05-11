import { MODULE_NAME } from './settings';

export const preloadTemplates = async function () {
	const templatePaths = [
		// Add paths to "module/XXX/templates"
		//`/modules/${MODULE_NAME}/templates/XXX.html`,
    `/modules/${MODULE_NAME}/templates/assignxp.html`,
    `/modules/${MODULE_NAME}/templates/assignxpchatmsg.html`,
    `/modules/${MODULE_NAME}/templates/contestedroll.html`,
    `/modules/${MODULE_NAME}/templates/contestedrollchatmsg.html`,
    `/modules/${MODULE_NAME}/templates/savingthrow.html`,
    `/modules/${MODULE_NAME}/templates/sheet.html`,
    `/modules/${MODULE_NAME}/templates/svgthrowchatmsg.html`,
    `/modules/${MODULE_NAME}/templates/tokenbar.html`,
	];

	return loadTemplates(templatePaths);
}
