import * as React from 'react';
import styles from './F1Results.module.scss';
import { IF1ResultsProps } from './IF1ResultsProps';
import { escape } from '@microsoft/sp-lodash-subset';
import { ListService } from '../common/services/ListService';

export default class F1Results extends React.Component<IF1ResultsProps, any> {
  private LIST_TITLE_RACES: string = "F1_Races";
  private LIST_TITLE_ENTRIES: string = "F1_Entries";
  private LIST_TITLE_DRIVERS: string = "F1_Drivers";

  private _listService: ListService;
  private _webUrl: string;

  
  constructor(props) {
    super(props);
    this._listService = new ListService(this.props.context.spHttpClient);
    this._webUrl = this.props.context.pageContext.web.absoluteUrl;
    this.state = {
      completedRaces: [{ id: 1, title: "AUS" }, { id: 2, title: "BAH" }],
      allEntries: [
        {
          userId: 1,
          displayName: "Dikis",
          points_allRaces: 36,
          raceEntries:
            [
              {
                raceId: 1,
                entry_P1: "Bob",
                points_P1: 12,
                entry_P2: "Jimmy",
                points_P2: 10,
                points_total: 22
              },
              {
                raceId: 2,
                entry_P1: "Jimbo",
                points_P1: 3,
                entry_P2: "Zizi",
                points_P2: 11,
                points_total: 14
              },
            ]
        },

        {
          userId: 2,
          displayName: "Bikis",
          points_allRaces: 23,
          raceEntries:
            [
              {
                raceId: 1,
                entry_P1: "Momo",
                points_P1: 7,
                entry_P2: "Beebee",
                points_P2: 16,
                points_total: 23
              }
            ]
        }
      ]
    };


  }
  public render(): React.ReactElement<IF1ResultsProps> {
    let tableHeader: React.ReactElement<any> = <table></table>;

    return (
      <div className={styles.f1Results}>
        <div className={styles.container}>
          <div className={styles.row}>
            <div className={styles.column}>
            <h2>Current Standings</h2>
            </div>
            <div className={styles.column}>
              <table id='results'>
                <tr><th></th>
                  {this.state.completedRaces.map((element, index) => (
                    <th>{element.title}</th>
                  ))}
                  <th>Total</th>
                </tr>
                {this.state.allEntries.map((userEntry, index) => (
                  <tr>
                    <td>{userEntry.displayName}</td>
                    {this.state.completedRaces.map((race, index) => (
                      <td>
                        {
                          userEntry.raceEntries.filter(
                            raceEntry => raceEntry.raceId === race.id)[0] ? userEntry.raceEntries.filter(
                              raceEntry => raceEntry.raceId === race.id)[0].points_total : ""
                        }
                      </td>                      
                    ))}
                    <td>{userEntry.points_allRaces}</td>
                  </tr>
                ))}
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
  public componentDidMount() {
    this._getCompletedRaces();
    this._getCompletedEntries();
  }

  private _getCompletedRaces(){
    let q: string = `<View><Query><Where><Eq><FieldRef Name='Points_Allocated' /><Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;

    var races = [];

    this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_RACES, q).then(racesFromSP => {
      racesFromSP.value.forEach(raceFromSP => {
        races.push({
          id: raceFromSP.Id,
          title: raceFromSP.Title
        })
      });

      this.setState(() => {
        return { completedRaces: races };
      });
    })
  }

  private _getCompletedEntries(){
    let q:string = `<View><Query><Where><Eq><FieldRef Name='ShowInResults' /><Value Type='Boolean'>1</Value></Eq></Where></Query></View>`;
    var completedEntries = [];
    this._listService.getListItemsByQuery(this._webUrl, this.LIST_TITLE_ENTRIES, q).then(entriesFromSP => {
      entriesFromSP.value.forEach(entryFromSP => {
        if(completedEntries.filter(v => v.userId == entryFromSP.AuthorId).length == 0){
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
      this.setState(() => {
        return { allEntries: completedEntries.sort(function (a, b) {
          return b.points_allRaces - a.points_allRaces;
        })};
      });
    });
  }
}
