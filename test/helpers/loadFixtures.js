import { waterfall } from 'async';
import Articles from './../fixtures/Article';
import Authors from './../fixtures/Author';
import Comments from './../fixtures/Comment';
import Publishers from './../fixtures/Publisher';

export default function(sails, done) {
  waterfall(
    [
      done => {
        sails.models.author.createEach(Authors).exec(() => {
          done();
        });
      },
      done => {
        sails.models.article.createEach(Articles).exec(() => {
          done();
        });
      },
      done => {
        sails.models.comment.createEach(Comments).exec(() => {
          done();
        });
      },
      done => {
        sails.models.publisher.createEach(Publishers).exec(() => {
          done();
        });
      }
    ],
    done
  );
}
