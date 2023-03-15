// Code generated by "genops.go -type=Operator -atkval=Attack -defval=Defense"; DO NOT EDIT.
package dissect

import "errors"

var _operatorRoles = map[Operator]TeamRole{
	104189663607: Attack,
	288200867351: Defense,
	291191151607: Attack,
	92270644033:  Attack,
	104189662920: Defense,
	92270641980:  Defense,
	92270644319:  Defense,
	92270644267:  Attack,
	92270644007:  Defense,
	104189663024: Attack,
	92270642526:  Defense,
	378305069945: Defense,
	92270642266:  Defense,
	92270642032:  Attack,
	104189663803: Defense,
	104189664390: Attack,
	92270644293:  Defense,
	92270644215:  Attack,
	161289666248: Attack,
	92270642188:  Defense,
	104189664704: Defense,
	92270644189:  Attack,
	161289666230: Defense,
	104189662071: Defense,
	92270642214:  Defense,
	92270644059:  Defense,
	92270642656:  Attack,
	391752120891: Defense,
	104189664273: Defense,
	373711624351: Defense,
	92270642760:  Attack,
	92270642292:  Attack,
	92270642136:  Attack,
	92270642604:  Defense,
	104189661861: Attack,
	92270642708:  Defense,
	104189664038: Attack,
	288200867444: Attack,
	104189663920: Attack,
	92270642318:  Defense,
	104189661965: Attack,
	92270642344:  Attack,
	92270642396:  Defense,
	92270642682:  Defense,
	104189663698: Defense,
	288200866821: Attack,
	174977508820: Defense,
	92270644241:  Defense,
	92270644163:  Defense,
}

func (i Operator) Role() (TeamRole, error) {
	if r, ok := _operatorRoles[i]; ok {
		return r, nil
	}
	return Attack, errors.New("role unknown for this operator")
}
