import * as cfn from 'aws-cdk-lib';

import { Stack } from './stack';

class App extends cfn.App {
    constructor() {
        super();

        new Stack(this, 'Bounan-Publisher', {});
    }
}

new App().synth();
