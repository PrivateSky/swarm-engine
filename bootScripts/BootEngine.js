function BootEngine(getSeed, getEDFS, initializeSwarmEngine, runtimeBundles, constitutionBundles) {

	if (typeof getSeed !== "function") {
		throw new Error("getSeed missing or not a function");
	}
	getSeed = promisify(getSeed);

	if (typeof getEDFS !== "function") {
		throw new Error("getEDFS missing or not a function");
	}
	getEDFS = promisify(getEDFS);

	if (typeof initializeSwarmEngine !== "function") {
		throw new Error("initializeSwarmEngine missing or not a function");
	}
	initializeSwarmEngine = promisify(initializeSwarmEngine);

	if (typeof runtimeBundles !== "undefined" && !Array.isArray(runtimeBundles)) {
		throw new Error("runtimeBundles is not array");
	}

	if (typeof constitutionBundles !== "undefined" && !Array.isArray(constitutionBundles)) {
		throw new Error("constitutionBundles is not array");
	}

	const EDFS = require('edfs');
	let edfs;

	const evalBundles = async (bundles, ignore) => {
		const listFiles = promisify(this.rawDossier.listFiles);
		const readFile = promisify(this.rawDossier.readFile);

		let fileList = await listFiles("/" + EDFS.constants.CSB.CONSTITUTION_FOLDER);
		fileList = bundles.filter(bundle => fileList.includes(`${bundle}`))
			.map(bundle => `/${EDFS.constants.CSB.CONSTITUTION_FOLDER}/${bundle}`);

		if (fileList.length !== bundles.length) {
			const message = `Some bundles missing. Expected to have ${JSON.stringify(bundles)} but got only ${JSON.stringify(fileList)}`;
			if (!ignore) {
				throw new Error(message);
			} else {
				console.log(message);
			}
		}

		for (let i = 0; i < fileList.length; i++) {
			var fileContent = await readFile(fileList[i]);
			eval(fileContent.toString());
		}
	};

	this.boot = function (callback) {
		const __boot = async () => {
			const seed = await getSeed();
			edfs = await getEDFS();
			this.rawDossier = edfs.loadRawDossier(seed);
			try{
                await evalBundles(runtimeBundles);
            }catch(err)
            {
                console.log(err);
            }
			await initializeSwarmEngine();
			if (typeof constitutionBundles !== "undefined") {
				try{
					await evalBundles(constitutionBundles, true);
				}catch(err)
				{
					console.log(err);
				}
			}
		};

		__boot()
			.then(() => callback(undefined, this.rawDossier))
			.catch(callback);
	};
}

function promisify(fn) {
	return function (...args) {
		return new Promise((resolve, reject) => {
			fn(...args, (err, ...res) => {
				if (err) {
					reject(err);
				} else {
					resolve(...res);
				}
			});
		});
	}
}

module.exports = BootEngine;
