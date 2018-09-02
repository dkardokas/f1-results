import * as React from 'react';
import styles from './F1Results.module.scss';
import { IF1ResultsProps } from './IF1ResultsProps';
import { ListService } from '../common/services/ListService';

export default class F1Results extends React.Component<IF1ResultsProps, any> {
  private LIST_TITLE_RACES: string = "F1_Races";
  private LIST_TITLE_ENTRIES: string = "F1_Entries";

  private _listService: ListService;
  private _webUrl: string;


  constructor(props) {
    super(props);
    this._listService = new ListService(this.props.context.spHttpClient);
    this._webUrl = this.props.context.pageContext.web.absoluteUrl;
    this.state = {
      completedRaces: [],
      allEntries: []
    };


  }
  public render(): React.ReactElement<IF1ResultsProps> {

    return (
      <div className={styles.f1Results}>
        <div className={styles.container}>
          <div id="results" className={styles.csstransforms}>
            <table className={styles["table-header-rotated"]}>
              <tr><th></th>
                {this.state.completedRaces.map((element) => (
                  <th className={styles.rotate}><div><span>{element.title}</span></div></th>
                ))}
                <th className={styles.rotate}><div><span>Best {this.state.bestOf}</span></div></th>
                <th className={styles.rotate}><div><span>Total</span></div></th>
              </tr>
              {this.state.allEntries.map((userEntry) => (
                <tr>
                  <td>{userEntry.displayName}</td>
                  {this.state.completedRaces.map((race) => (
                    <td>
                      {
                        userEntry.raceEntries.filter(
                          raceEntry => raceEntry.raceId === race.id)[0] ? userEntry.raceEntries.filter(
                            raceEntry => raceEntry.raceId === race.id)[0].points_total : ""
                      }
                    </td>
                  ))}
                  <td>{userEntry.topEntries}</td>
                  <td>{userEntry.points_allRaces}</td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      </div>
    );
  }
  public componentDidMount() {
    this._getCompletedRaces().then(() =>{
      this._getCompletedEntries();
    });    
  }

  private _getTopXPoints(userEntry, x) {
    userEntry.raceEntries.sort(function (a, b) {
      return b.points_total - a.points_total;
    });
    let bestPoints = 0;
    for (let i: number = 0; i < x; i++)
      bestPoints += userEntry.raceEntries[i].points_total;
    return bestPoints
  }


  private _getCompletedRaces(): Promise<any> {
    let q: string = `<View><Query><Where><Eq><FieldRef Name='Points_Allocated' /><Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;

    var races = [];
    return new Promise<any>((resolve) => {
      this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_RACES, q).then(racesFromSP => {
        racesFromSP.value.forEach(raceFromSP => {
          races.push({
            id: raceFromSP.Id,
            title: raceFromSP.Title
          });
        });

        this.setState(() => {
          return { 
            completedRaces: races,
            bestOf: races.length - 2
           };
        });

        resolve(true);
      });
    });
  }

  private _getCompletedEntries() {
    let q: string = `<View><Query><Where><Eq><FieldRef Name='ShowInResults' /><Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;
    var completedEntries = [];
    this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_ENTRIES, q).then(entriesFromSP => {
      entriesFromSP.value.forEach(entryFromSP => {
        if (completedEntries.filter(v => v.userId == entryFromSP.AuthorId).length == 0) {
          completedEntries.push({
            userId: entryFromSP.AuthorId,
            displayName: entryFromSP.FieldValuesAsText.Author,
            raceEntries: [],
            points_allRaces: 0
          });
        }
        let currentUserEntry = completedEntries.filter(v => v.userId == entryFromSP.AuthorId)[0];
        let pointsForRace = entryFromSP.P1_Points + entryFromSP.P2_Points + entryFromSP.P3_Points + entryFromSP.P4_Points + entryFromSP.P5_Points;
        currentUserEntry.raceEntries.push({
          raceId: entryFromSP.RaceId,
          entry_P1: entryFromSP.Entry_P1,
          entry_P2: entryFromSP.Entry_P2,
          entry_P3: entryFromSP.Entry_P3,
          entry_P4: entryFromSP.Entry_P4,
          entry_P5: entryFromSP.Entry_P5,

          points_P1: entryFromSP.P1_Points,
          points_P2: entryFromSP.P2_Points,
          points_P3: entryFromSP.P3_Points,
          points_P4: entryFromSP.P4_Points,
          points_P5: entryFromSP.P5_Points,

          points_total: pointsForRace
        });
        currentUserEntry.points_allRaces += pointsForRace;
      });

      completedEntries.forEach(userEntry => {
        userEntry.topEntries = this._getTopXPoints(userEntry, this.state.bestOf);
      });
      this.setState(() => {
        return {
          allEntries: completedEntries.sort(function (a, b) {
            return b.topEntries - a.topEntries;
          })
        };
      });
    });
  }
}