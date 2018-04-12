import { waterfall } from 'async';
import AssessmentQuestions from './../fixtures/AssessmentQuestion';
import Bars from './../fixtures/Bar';
import Foos from './../fixtures/Foo';
import Relations from './../fixtures/BarFoosFooBars';

export default function(sails, done) {
    waterfall(
        [
            done => {
                sails.models.bar.createEach(Bars).exec(() => {
                    done();
                });
            },
            done => {
                sails.models.foo.createEach(Foos).exec(() => {
                    done();
                });
            },
            done => {
                sails.models.assessmentquestion.createEach(AssessmentQuestions).exec(() => {
                    done();
                });
            },
            done => {
                sails.models['bar_foos__foo_bars'].createEach(Relations).exec(() => {
                    done();
                });
            }
        ],
        done
    );
}
